// --- Navigation & Core Logic ---
const screens = {
    home: document.getElementById('home-screen'),
    game: document.getElementById('game-screen'),
    photobooth: document.getElementById('photobooth-screen')
};

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
    
    if(screenName === 'photobooth') {
        startCamera();
    } else {
        if(video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
    }
}

document.getElementById('nav-photobooth').addEventListener('click', () => showScreen('photobooth'));
document.getElementById('nav-game').addEventListener('click', () => {
    checkDevicePlayedStatus();
    showScreen('game');
});
document.querySelectorAll('.nav-home').forEach(btn => {
    btn.addEventListener('click', () => {
        showScreen('home');
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        clearTimeout(gameFlowTimeout);
        clearTimeout(timerInterval);
    });
});

// --- SECRET DEV TOOL: Clear Leaderboard & Device Lock ---
// Press Ctrl + Alt + D at any time to trigger this!
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.code === 'KeyD') {
        const confirmClear = confirm("DEV TOOL: Clear the leaderboard and device lock?");
        if(confirmClear) {
            localStorage.removeItem('kiyotieLeaderboard');
            localStorage.removeItem('kiyotiePlayed');
            alert("Database wiped. Refreshing page...");
            location.reload();
        }
    }
});


// ==========================================
// --- 3-SECOND SONG CHALLENGE LOGIC ---
// ==========================================
const kiyoSongs = [
    { id: 1, title: "Urong Sulong", src: "audio/urong_sulong.mp3" },
    { id: 2, title: "Eba", src: "audio/eba.mp3" },
    { id: 3, title: "Isa Lang", src: "audio/isa_lang.mp3" },
    { id: 4, title: "Dantay", src: "audio/dantay.mp3" },
    { id: 5, title: "Hey", src: "audio/hey.mp3" },
    { id: 6, title: "Puyat", src: "audio/puyat.mp3" },
    { id: 7, title: "Pambihira", src: "audio/pambihira.mp3" },
    { id: 8, title: "Comeback", src: "audio/comeback.mp3" },
    { id: 9, title: "Ikaw Lang", src: "audio/ikaw_lang.mp3" },
    { id: 10, title: "Padayon", src: "audio/padayon.mp3" },
    { id: 11, title: "TULO LAWAY", src: "audio/tulo_laway.mp3" },
    { id: 12, title: "Okay lang yan", src: "audio/okay_lang_yan.mp3" },
    { id: 13, title: "HANAP", src: "audio/hanap.mp3" },
    { id: 14, title: "Eroplanong Papel", src: "audio/eroplanong_papel.mp3" },
    { id: 15, title: "SHINEBOI", src: "audio/shineboi.mp3" },
    { id: 16, title: "not even her", src: "audio/not_even_her.mp3" },
];

let currentScore = 0;
let totalTimeMs = 0;
let currentQuestionIndex = 0;
let randomizedPlaylist = [];
let playerName = "";

let currentAudio = null; 
let gameFlowTimeout;
let timerInterval;
let roundStartTime = 0;

const startBtnGame = document.getElementById('start-game-btn');
const confirmStartBtn = document.getElementById('confirm-start-btn');
const gameStartPanel = document.getElementById('game-start-panel');
const instructionsPanel = document.getElementById('instructions-panel');
const gamePlayPanel = document.getElementById('game-play-panel');
const gameOverPanel = document.getElementById('game-over-panel');

const guessingArea = document.getElementById('guessing-area');
const guessInput = document.getElementById('song-guess-input');
const submitGuessBtn = document.getElementById('submit-guess-btn');
const feedbackDisplay = document.getElementById('feedback-display');
const visualizer = document.getElementById('visualizer');
const questionText = document.getElementById('question-text');
const timerFill = document.getElementById('timer-fill');

const scoreDisplay = document.getElementById('current-score');
const totalTimeDisplay = document.getElementById('total-time-display');
const leaderboardList = document.getElementById('leaderboard-list');

// -- Check if played --
function checkDevicePlayedStatus() {
    const hasPlayed = localStorage.getItem('kiyotiePlayed');
    if (hasPlayed === "true") {
        document.getElementById('already-played-msg').style.display = 'block';
        startBtnGame.style.display = 'none';
    } else {
        document.getElementById('already-played-msg').style.display = 'none';
        startBtnGame.style.display = 'inline-block';
    }
    loadLeaderboard();
}

// -- Leaderboard Logic --
function loadLeaderboard() {
    let board = JSON.parse(localStorage.getItem('kiyotieLeaderboard')) || [];
    leaderboardList.innerHTML = '';
    if(board.length === 0) {
        leaderboardList.innerHTML = '<li>No challengers yet! Be the first!</li>';
    } else {
        // Sort primarily by Score (Descending) then by Total Time (Ascending - Faster is better)
        board.sort((a,b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.time - b.time;
        }).forEach((entry, i) => {
            leaderboardList.innerHTML += `
                <li>
                    <span class="lb-rank">#${i+1}</span>
                    <span class="lb-name">${entry.name}</span> 
                    <span class="lb-stats"><span>${entry.score}</span>/16 in <span>${entry.time}s</span></span>
                </li>`;
        });
    }
}

// -- Button Listeners --
startBtnGame.addEventListener('click', () => {
    gameStartPanel.style.display = 'none';
    instructionsPanel.style.display = 'block';
});

confirmStartBtn.addEventListener('click', () => {
    const nameInput = document.getElementById('player-name-input').value.trim();
    if(!nameInput) {
        alert("Please enter your fan name before starting!");
        return;
    }
    playerName = nameInput;
    instructionsPanel.style.display = 'none';
    startGame();
});

function startGame() {
    currentScore = 0;
    totalTimeMs = 0;
    currentQuestionIndex = 0;
    scoreDisplay.innerText = currentScore;
    totalTimeDisplay.innerText = "0.00";
    
    gameStartPanel.style.display = 'none';
    gameOverPanel.style.display = 'none';
    gamePlayPanel.style.display = 'block';
    
    // Randomize all 16 songs
    randomizedPlaylist = [...kiyoSongs].sort(() => 0.5 - Math.random());
    
    playAudioIntroPhase();
}

// Phase 1: Play 3 Seconds
function playAudioIntroPhase() {
    if(currentQuestionIndex >= randomizedPlaylist.length) {
        endGame();
        return;
    }

    const currentSong = randomizedPlaylist[currentQuestionIndex];
    
    // Reset UI for intro
    guessingArea.style.display = 'none';
    feedbackDisplay.style.display = 'none';
    visualizer.style.opacity = '1';
    timerFill.style.transition = 'none';
    timerFill.style.transform = 'scaleX(1)';
    guessInput.value = "";
    questionText.innerText = `🎵 Track ${currentQuestionIndex + 1} of 16 - Listen closely!`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    
    currentAudio = new Audio(currentSong.src);
    currentAudio.play().catch(e => console.error("Audio block:", e));

    // Play EXACTLY 3 seconds
    gameFlowTimeout = setTimeout(() => {
        if (currentAudio) currentAudio.pause(); 
        startGuessingPhase();
    }, 3000);
}

// Phase 2: 10 Seconds to Type
function startGuessingPhase() {
    visualizer.style.opacity = '0.1';
    questionText.innerText = "Type the exact title!";
    guessingArea.style.display = 'block';
    submitGuessBtn.disabled = false;
    guessInput.disabled = false;
    guessInput.focus();

    // Start 10s visual timer
    timerFill.style.transition = `transform 10s linear`;
    timerFill.style.transform = 'scaleX(0)';

    roundStartTime = Date.now();

    // Force end of guess phase after 10s
    timerInterval = setTimeout(() => {
        processGuess(true); // true = timed out
    }, 10000);
}

// Submit via button or Enter key
submitGuessBtn.addEventListener('click', () => processGuess(false));
guessInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') processGuess(false);
});

// Process the guess and calculate time
function processGuess(isTimeout) {
    clearTimeout(timerInterval);
    submitGuessBtn.disabled = true;
    guessInput.disabled = true;

    // Calculate exact time taken (capped at 10,000ms)
    let elapsed = Math.min(10000, Date.now() - roundStartTime);
    totalTimeMs += elapsed;
    totalTimeDisplay.innerText = (totalTimeMs / 1000).toFixed(2);

    const currentSong = randomizedPlaylist[currentQuestionIndex];
    const userGuess = guessInput.value.trim().toLowerCase();
    const correctTitle = currentSong.title.trim().toLowerCase();

    feedbackDisplay.style.display = 'block';

    if(!isTimeout && userGuess === correctTitle) {
        currentScore++;
        scoreDisplay.innerText = currentScore;
        feedbackDisplay.style.color = "#00e676";
        feedbackDisplay.innerText = `✅ Correct! "${currentSong.title}"`;
    } else {
        feedbackDisplay.style.color = "var(--primary-pink)";
        feedbackDisplay.innerText = `❌ Incorrect! It was: "${currentSong.title}"`;
    }

    startExtendedAudioPhase();
}

// Phase 3: Reveal Answer & Play 10 more seconds
function startExtendedAudioPhase() {
    guessingArea.style.display = 'none';
    visualizer.style.opacity = '1';
    questionText.innerText = "Vibing... 🎶";

    // Resume audio
    if(currentAudio) currentAudio.play();

    // Wait 10 seconds before moving to next track
    gameFlowTimeout = setTimeout(() => {
        currentQuestionIndex++;
        playAudioIntroPhase();
    }, 10000);
}

// End Game
function endGame() {
    gamePlayPanel.style.display = 'none';
    gameOverPanel.style.display = 'block';
    
    const finalSeconds = (totalTimeMs / 1000).toFixed(2);
    document.getElementById('final-score').innerText = currentScore;
    document.getElementById('final-time').innerText = finalSeconds;

    // Save Score & Lock Device
    let board = JSON.parse(localStorage.getItem('kiyotieLeaderboard')) || [];
    board.push({ name: playerName, score: currentScore, time: parseFloat(finalSeconds) });
    localStorage.setItem('kiyotieLeaderboard', JSON.stringify(board));
    localStorage.setItem('kiyotiePlayed', "true"); // Lock out

    if(typeof confetti === 'function') {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#ea8ca6', '#121212', '#a8a8a8'] });
    }
}


// ==========================================
// --- PHOTOBOOTH LOGIC ---
// ==========================================
const video = document.getElementById('video');
const canvas = document.getElementById('result-canvas');
const ctx = canvas.getContext('2d');
const frameImage = document.getElementById('frame');
const startBtn = document.getElementById('start-btn');
const downloadBtn = document.getElementById('download-btn');
const countdownDisplay = document.getElementById('countdown-display');
const posePrompt = document.getElementById('pose-prompt');
const flash = document.getElementById('flash');
const snapTemp = document.getElementById('snap-temp');
const videoWrapper = document.getElementById('video-wrapper');
const printingOverlay = document.getElementById('printing-overlay');
const progressFill = document.getElementById('progress-fill');

const photoWidth = 920;  
const photoHeight = 473; 
const photoX = 80;       
const positions = [290, 773, 1256];

const poseMessages = ["Pose 1: Kiyotie check! ✌️", "Pose 2: Heart sign! 🫶", "Pose 3: Concert mode! 🎤"];

let photoCounter = 1; 

function getFilename() { return `Kiyotie-Photostrip-${String(photoCounter).padStart(3, '0')}.png`; }

function drawVideoCover(context, videoElement, x, y, w, h) {
    const videoRatio = videoElement.videoWidth / videoElement.videoHeight;
    const targetRatio = w / h;
    let sWidth = videoElement.videoWidth, sHeight = videoElement.videoHeight;
    let sx = 0, sy = 0;

    if (videoRatio > targetRatio) {
        sWidth = sHeight * targetRatio;
        sx = (videoElement.videoWidth - sWidth) / 2;
    } else {
        sHeight = sWidth / targetRatio;
        sy = (videoElement.videoHeight - sHeight) / 2;
    }
    context.drawImage(videoElement, sx, sy, sWidth, sHeight, x, y, w, h);
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: {ideal: 1280}, height: {ideal: 720} } });
        video.srcObject = stream;
    } catch (err) { alert("Please allow camera access for the photobooth!"); }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function runCountdown() {
    for (let i = 3; i > 0; i--) {
        countdownDisplay.innerText = i; countdownDisplay.classList.remove('soft-pop-anim');
        void countdownDisplay.offsetWidth; countdownDisplay.classList.add('soft-pop-anim');
        await sleep(1000);
    }
    countdownDisplay.innerText = "";
}

startBtn.addEventListener('click', async () => {
    startBtn.disabled = true; 
    downloadBtn.style.display = 'none'; // Hide download button when a new session starts
    posePrompt.style.opacity = 1; videoWrapper.classList.remove('idle-border');
    document.getElementById('idle-container').style.opacity = '0';

    ctx.fillStyle = "#0f0c1b"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(frameImage.complete && frameImage.naturalHeight !== 0) ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 3; i++) {
        posePrompt.innerText = poseMessages[i]; await runCountdown();
        
        ctx.save(); ctx.translate(photoX + photoWidth, positions[i]); ctx.scale(-1, 1); 
        drawVideoCover(ctx, video, 0, 0, photoWidth, photoHeight); ctx.restore();
        
        if(frameImage.complete && frameImage.naturalHeight !== 0) ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

        const tempCanvas = document.createElement('canvas'); tempCanvas.width = photoWidth; tempCanvas.height = photoHeight;
        const tCtx = tempCanvas.getContext('2d'); tCtx.translate(photoWidth, 0); tCtx.scale(-1, 1);
        drawVideoCover(tCtx, video, 0, 0, photoWidth, photoHeight); 
        
        snapTemp.src = tempCanvas.toDataURL(); snapTemp.style.display = 'block';
        flash.classList.remove('flash-fade'); flash.classList.add('flash-active');
        setTimeout(() => { flash.classList.remove('flash-active'); flash.classList.add('flash-fade'); }, 50);

        snapTemp.classList.remove('snap-anim'); void snapTemp.offsetWidth; snapTemp.classList.add('snap-anim');
        await sleep(800); snapTemp.style.display = 'none'; 
    }

    posePrompt.innerText = "All done! Slay! ✨";
    if (typeof confetti === "function") confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#ea8ca6', '#121212', '#a8a8a8', '#ffffff'] });

    setTimeout(() => { posePrompt.style.opacity = 0; }, 3000); 
    
    await autoSaveRoutine();

    startBtn.innerText = "Retake Photos"; startBtn.disabled = false;
    videoWrapper.classList.add('idle-border'); document.getElementById('idle-container').style.opacity = '1';
    
    // Show download button only after the photo strip is ready
    downloadBtn.style.display = 'inline-block'; 
});

async function autoSaveRoutine() {
    // Show a clean developing animation
    printingOverlay.style.display = 'flex'; document.getElementById('printing-text').innerText = "Developing polaroid...";
    progressFill.style.transition = 'none'; progressFill.style.width = '0%';
    
    setTimeout(() => { progressFill.style.transition = 'width 2s linear'; progressFill.style.width = '100%'; }, 50);
    await sleep(2000); 

    document.getElementById('printing-text').innerText = "Ready to save! 📸";
    await sleep(1500); 
    printingOverlay.style.display = 'none';
}

function triggerStandardDownload(filename) {
    const link = document.createElement('a'); link.download = filename; link.href = canvas.toDataURL('image/png'); link.click();
}

downloadBtn.addEventListener('click', () => { 
    triggerStandardDownload(getFilename()); 
    photoCounter++; 
    // Button remains visible so they can download it again if needed before retaking
});

function drawInitialFrame() {
    ctx.fillStyle = "#0f0c1b"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(frameImage.complete && frameImage.naturalHeight !== 0) ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
}
frameImage.onload = drawInitialFrame; drawInitialFrame();

const modal = document.getElementById("preview-modal");
canvas.addEventListener("click", () => {
    if (!startBtn.disabled && startBtn.innerText === "Retake Photos") {
        modal.style.display = "flex"; document.getElementById("modal-image").src = canvas.toDataURL('image/png');
    }
});
document.querySelector(".close-modal").addEventListener("click", () => modal.style.display = "none");
modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

document.addEventListener('keydown', (event) => {
    if(screens.photobooth.classList.contains('active')) {
        if (event.code === 'Space') { event.preventDefault(); if (!startBtn.disabled) startBtn.click(); }
        if (event.code === 'KeyS' && downloadBtn.style.display !== 'none') downloadBtn.click();
    }
    if (event.code === 'Escape' && modal.style.display === "flex") modal.style.display = "none";
});