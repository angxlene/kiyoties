// ==========================================
// --- GLOBAL DATA ---
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
    { id: 17, title: "Hanggang Kailan", src: "audio/hanggang_kailan.mp3" },
    { id: 18, title: "MALAKAS ", src: "audio/malakas.mp3" },
    { id: 19, title: "LALA", src: "audio/lala.mp3" },
    { id: 20, title: "Bangkok Freestyle", src: "audio/bangkok_freestyle.mp3" },
];

const TOTAL_SONGS = kiyoSongs.length;

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ui-total-1').innerText = TOTAL_SONGS;
    document.getElementById('ui-total-2').innerText = TOTAL_SONGS;
    document.getElementById('ui-total-3').innerText = TOTAL_SONGS;
});

// --- Navigation & Core Logic ---
const screens = {
    home: document.getElementById('home-screen'),
    game: document.getElementById('game-screen'),
    photobooth: document.getElementById('photobooth-screen')
};

// --- Photobooth Audio Logic ---
let pbPlaylist = [];
let pbAudio = null;

function playPhotoboothMusic() {
    if (pbAudio) return; 

    if (pbPlaylist.length === 0) {
        pbPlaylist = [...kiyoSongs].sort(() => 0.5 - Math.random());
    }
    
    const song = pbPlaylist.pop();
    pbAudio = new Audio(song.src);
    pbAudio.volume = 0.5; 
    
    pbAudio.play().catch(e => console.log("Audio autoplay blocked by browser:", e));

    pbAudio.addEventListener('ended', () => {
        pbAudio = null; 
        playPhotoboothMusic(); 
    });
}

function stopPhotoboothMusic() {
    if (pbAudio) {
        pbAudio.pause();
        pbAudio.currentTime = 0;
        pbAudio = null;
    }
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
    
    if(screenName === 'photobooth') {
        startCamera();
        playPhotoboothMusic();
    } else {
        stopPhotoboothMusic();
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
// --- SONG CHALLENGE LOGIC ---
// ==========================================

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
const progressTracker = document.getElementById('progress-tracker');

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

function loadLeaderboard() {
    let board = JSON.parse(localStorage.getItem('kiyotieLeaderboard')) || [];
    leaderboardList.innerHTML = '';
    if(board.length === 0) {
        leaderboardList.innerHTML = '<li>No challengers yet! Be the first!</li>';
    } else {
        board.sort((a,b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.time - b.time;
        }).forEach((entry, i) => {
            leaderboardList.innerHTML += `
                <li>
                    <span class="lb-rank">#${i+1}</span>
                    <span class="lb-name">${entry.name}</span> 
                    <span class="lb-stats"><span>${entry.score}</span>/${TOTAL_SONGS} in <span>${entry.time}s</span></span>
                </li>`;
        });
    }
}

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
    
    // Initialize Progress Tracker
    progressTracker.innerHTML = '';
    for(let i=0; i<TOTAL_SONGS; i++) {
        progressTracker.innerHTML += `<div class="progress-segment" id="seg-${i}"></div>`;
    }

    gameStartPanel.style.display = 'none';
    gameOverPanel.style.display = 'none';
    gamePlayPanel.style.display = 'block';
    
    randomizedPlaylist = [...kiyoSongs].sort(() => 0.5 - Math.random());
    
    playAudioIntroPhase();
}

function playAudioIntroPhase() {
    if(currentQuestionIndex >= randomizedPlaylist.length) {
        endGame();
        return;
    }

    const currentSong = randomizedPlaylist[currentQuestionIndex];
    
    guessingArea.style.display = 'none';
    feedbackDisplay.style.display = 'none';
    visualizer.style.opacity = '1';
    timerFill.style.transition = 'none';
    timerFill.style.transform = 'scaleX(1)';
    guessInput.value = "";
    questionText.innerText = `🎵 Track ${currentQuestionIndex + 1} of ${TOTAL_SONGS} - Listen closely!`;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    
    currentAudio = new Audio(currentSong.src);
    currentAudio.play().catch(e => console.error("Audio block:", e));

    gameFlowTimeout = setTimeout(() => {
        if (currentAudio) currentAudio.pause(); 
        startGuessingPhase();
    }, 3000);
}

function startGuessingPhase() {
    visualizer.style.opacity = '0.1';
    questionText.innerText = "Type the exact title!";
    guessingArea.style.display = 'block';
    submitGuessBtn.disabled = false;
    guessInput.disabled = false;
    guessInput.focus();

    timerFill.style.transition = `transform 10s linear`;
    timerFill.style.transform = 'scaleX(0)';

    roundStartTime = Date.now();

    timerInterval = setTimeout(() => {
        processGuess(true); 
    }, 10000);
}

submitGuessBtn.addEventListener('click', () => processGuess(false));
guessInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') processGuess(false);
});

function processGuess(isTimeout) {
    clearTimeout(timerInterval);
    submitGuessBtn.disabled = true;
    guessInput.disabled = true;

    let elapsed = Math.min(10000, Date.now() - roundStartTime);
    totalTimeMs += elapsed;
    totalTimeDisplay.innerText = (totalTimeMs / 1000).toFixed(2);

    const currentSong = randomizedPlaylist[currentQuestionIndex];
    const userGuess = guessInput.value.trim().toLowerCase();
    const correctTitle = currentSong.title.trim().toLowerCase();

    feedbackDisplay.style.display = 'block';
    const activeSegment = document.getElementById(`seg-${currentQuestionIndex}`);

    if(!isTimeout && userGuess === correctTitle) {
        currentScore++;
        scoreDisplay.innerText = currentScore;
        feedbackDisplay.style.color = "#00e676";
        feedbackDisplay.innerText = `✅ Correct! "${currentSong.title}"`;
        activeSegment.classList.add('correct');
    } else {
        feedbackDisplay.style.color = "var(--primary-pink)";
        feedbackDisplay.innerText = `❌ Incorrect! It was: "${currentSong.title}"`;
        activeSegment.classList.add('incorrect');
    }

    startExtendedAudioPhase();
}

function startExtendedAudioPhase() {
    guessingArea.style.display = 'none';
    visualizer.style.opacity = '1';
    questionText.innerText = "Vibing... 🎶";

    if(currentAudio) currentAudio.play();

    gameFlowTimeout = setTimeout(() => {
        currentQuestionIndex++;
        playAudioIntroPhase();
    }, 10000);
}

function endGame() {
    gamePlayPanel.style.display = 'none';
    gameOverPanel.style.display = 'block';
    
    const finalSeconds = (totalTimeMs / 1000).toFixed(2);
    document.getElementById('final-score').innerText = currentScore;
    document.getElementById('final-time').innerText = finalSeconds;

    let board = JSON.parse(localStorage.getItem('kiyotieLeaderboard')) || [];
    board.push({ name: playerName, score: currentScore, time: parseFloat(finalSeconds) });
    localStorage.setItem('kiyotieLeaderboard', JSON.stringify(board));
    localStorage.setItem('kiyotiePlayed', "true");

    if(typeof confetti === 'function') {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors: ['#ea8ca6', '#121212', '#a8a8a8'] });
    }
}

// Scorecard Generator Logic
document.getElementById('download-scorecard-btn').addEventListener('click', () => {
    const sCanvas = document.getElementById('scorecard-canvas');
    const sCtx = sCanvas.getContext('2d');
    
    // Background
    sCtx.fillStyle = '#121212';
    sCtx.fillRect(0, 0, 1080, 1920);
    
    // Gradient Circle Accent
    const grd = sCtx.createRadialGradient(540, 600, 50, 540, 600, 500);
    grd.addColorStop(0, "rgba(234, 140, 166, 0.4)");
    grd.addColorStop(1, "transparent");
    sCtx.fillStyle = grd;
    sCtx.fillRect(0, 0, 1080, 1920);

    // Decorative Graphic
    sCtx.strokeStyle = '#ea8ca6';
    sCtx.lineWidth = 15;
    sCtx.beginPath(); sCtx.arc(540, 700, 350, 0, Math.PI*2); sCtx.stroke();

    // Text Content
    sCtx.textAlign = 'center';
    
    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 80px sans-serif';
    sCtx.fillText('KIYOTIES', 540, 250);
    
    sCtx.fillStyle = '#ea8ca6';
    sCtx.font = '50px sans-serif';
    sCtx.fillText('Ultimate Fan Challenge', 540, 320);

    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 220px sans-serif';
    sCtx.fillText(`${currentScore}/${TOTAL_SONGS}`, 540, 750);
    
    sCtx.fillStyle = '#a8a8a8';
    sCtx.font = '60px sans-serif';
    const finalSeconds = (totalTimeMs / 1000).toFixed(2);
    sCtx.fillText(`Completed in ${finalSeconds}s`, 540, 880);

    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'italic 70px sans-serif';
    sCtx.fillText(`@${playerName}`, 540, 1300);

    sCtx.fillStyle = '#ea8ca6';
    sCtx.font = '40px sans-serif';
    sCtx.fillText('Think you can beat me?', 540, 1750);

    // Download
    const link = document.createElement('a');
    link.download = `Kiyoties_Scorecard_${playerName}.png`;
    link.href = sCanvas.toDataURL('image/png');
    link.click();
});


// ==========================================
// --- PHOTOBOOTH LOGIC ---
// ==========================================
const video = document.getElementById('video');
const canvas = document.getElementById('result-canvas');
const ctx = canvas.getContext('2d');
const frameImage = document.getElementById('frame');
const startBtn = document.getElementById('start-btn');
const saveBtn = document.getElementById('save-btn'); 
const countdownDisplay = document.getElementById('countdown-display');
const posePrompt = document.getElementById('pose-prompt');
const flash = document.getElementById('flash');
const snapTemp = document.getElementById('snap-temp');
const videoWrapper = document.getElementById('video-wrapper');
const printingOverlay = document.getElementById('printing-overlay');
const progressFill = document.getElementById('progress-fill');
const stickerMenu = document.getElementById('sticker-menu');

const photoWidth = 920;  
const photoHeight = 473; 
const photoX = 80;       
const positions = [290, 773, 1256];

let photoCounter = 1; 

// State Management for Editing
let capturedFrames = [null, null, null];
let activeStickers = [];
let draggingSticker = null;
let dragOffsetX = 0, dragOffsetY = 0;

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

// Renders the final composition to the visible canvas
function renderFinalCanvas() {
    ctx.fillStyle = "#0f0c1b"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw Captured Frames
    for(let i=0; i<3; i++) {
        if(capturedFrames[i]) {
            ctx.drawImage(capturedFrames[i], photoX, positions[i], photoWidth, photoHeight);
        }
    }
    
    // 2. Draw Static Frame Template
    if(frameImage.complete && frameImage.naturalHeight !== 0) {
        ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
    }

    // 3. Draw Stickers (Both Emoji and Image types)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    activeStickers.forEach(st => {
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 15;
        
        if (st.type === 'text') {
            ctx.font = `${st.size}px sans-serif`;
            ctx.fillText(st.content, st.x, st.y);
        } else if (st.type === 'image') {
            // Draw image centered at X, Y
            ctx.drawImage(
                st.imgElement, 
                st.x - (st.width / 2), 
                st.y - (st.height / 2), 
                st.width, 
                st.height
            );
        }
        
        ctx.shadowBlur = 0; // reset shadow for next items
    });
}

async function captureSingleFrame(index) {
    posePrompt.innerText = `📸 Photo ${index + 1}`;
    posePrompt.style.opacity = 1;
    await runCountdown();
    
    // Capture to off-screen canvas to save image data permanently
    const tempCanvas = document.createElement('canvas'); 
    tempCanvas.width = photoWidth; 
    tempCanvas.height = photoHeight;
    const tCtx = tempCanvas.getContext('2d'); 
    tCtx.translate(photoWidth, 0); 
    tCtx.scale(-1, 1);
    drawVideoCover(tCtx, video, 0, 0, photoWidth, photoHeight); 
    
    capturedFrames[index] = tempCanvas;
    renderFinalCanvas();

    // Visual Flash FX
    snapTemp.src = tempCanvas.toDataURL(); snapTemp.style.display = 'block';
    flash.classList.remove('flash-fade'); flash.classList.add('flash-active');
    setTimeout(() => { flash.classList.remove('flash-active'); flash.classList.add('flash-fade'); }, 50);

    snapTemp.classList.remove('snap-anim'); void snapTemp.offsetWidth; snapTemp.classList.add('snap-anim');
    await sleep(800); snapTemp.style.display = 'none'; 
}

startBtn.addEventListener('click', async () => {
    if (startBtn.innerText === "🔄 Retake All") {
        capturedFrames = [null, null, null];
        activeStickers = [];
        renderFinalCanvas();
    }

    startBtn.disabled = true; 
    saveBtn.style.display = 'none'; 
    stickerMenu.style.display = 'none';
    startBtn.classList.remove('secondary'); 
    videoWrapper.classList.remove('idle-border');
    document.getElementById('idle-container').style.opacity = '0';

    for (let i = 0; i < 3; i++) {
        if(!capturedFrames[i]) {
            await captureSingleFrame(i);
        }
    }

    if (typeof confetti === "function") confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#ea8ca6', '#121212', '#a8a8a8', '#ffffff'] });
    
    finishCapturePhase();
});

function finishCapturePhase() {
    startBtn.innerText = "🔄 Retake All"; 
    startBtn.classList.add('secondary'); 
    startBtn.disabled = false;
    
    videoWrapper.classList.add('idle-border'); document.getElementById('idle-container').style.opacity = '1';
    saveBtn.style.display = 'inline-block'; 
    stickerMenu.style.display = 'flex';
    
    posePrompt.innerText = "Tap a frame to retake it, or add stickers! ✨";
    posePrompt.style.opacity = 1;
    setTimeout(() => { posePrompt.style.opacity = 0; }, 4000); 
}

// --- Sticker Logic ---
document.querySelectorAll('.sticker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Check if the clicked sticker is an image tag or a button (emoji)
        if (btn.tagName.toLowerCase() === 'img') {
            activeStickers.push({
                type: 'image',
                imgElement: btn,
                x: canvas.width / 2,
                y: canvas.height / 2,
                // Base width for a 1080x1920 canvas, maintaining aspect ratio
                width: 350, 
                height: 350 * (btn.naturalHeight / btn.naturalWidth), 
                isDragging: false
            });
        } else {
            activeStickers.push({
                type: 'text',
                content: btn.innerText,
                x: canvas.width / 2,
                y: canvas.height / 2,
                size: 200, 
                isDragging: false
            });
        }
        renderFinalCanvas();
    });
});

// --- Mouse / Touch Interactivity on Canvas ---
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if(e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handleInputDown(e) {
    if (startBtn.disabled) return; 
    if (capturedFrames.includes(null)) return; 

    const coords = getCanvasCoordinates(e);

    // 1. Check Stickers (iterate backwards to pick topmost)
    for(let i = activeStickers.length - 1; i >= 0; i--) {
        const st = activeStickers[i];
        let w, h;
        
        // Calculate Hitbox based on sticker type
        if (st.type === 'text') {
            ctx.font = `${st.size}px sans-serif`;
            w = ctx.measureText(st.content).width;
            h = st.size; 
        } else if (st.type === 'image') {
            w = st.width;
            h = st.height;
        }

        // Hitbox detection
        if(coords.x > st.x - w/2 && coords.x < st.x + w/2 &&
           coords.y > st.y - h/2 && coords.y < st.y + h/2) {
            draggingSticker = st;
            st.isDragging = true;
            dragOffsetX = coords.x - st.x;
            dragOffsetY = coords.y - st.y;
            
            // Move sticker to end of array so it renders on top
            activeStickers.splice(i, 1);
            activeStickers.push(st);
            return; 
        }
    }

    // 2. Check Frames for Single Retake
    for(let i=0; i<3; i++) {
        if(coords.x >= photoX && coords.x <= photoX + photoWidth &&
           coords.y >= positions[i] && coords.y <= positions[i] + photoHeight) {
            triggerSingleRetake(i);
            return;
        }
    }
}

function handleInputMove(e) {
    if(draggingSticker) {
        e.preventDefault(); // Prevent scrolling on mobile while dragging
        const coords = getCanvasCoordinates(e);
        draggingSticker.x = coords.x - dragOffsetX;
        draggingSticker.y = coords.y - dragOffsetY;
        renderFinalCanvas();
    }
}

function handleInputUp() {
    if(draggingSticker) {
        draggingSticker.isDragging = false;
        draggingSticker = null;
    }
}

// Mouse Event Listeners
canvas.addEventListener('mousedown', handleInputDown);
canvas.addEventListener('mousemove', handleInputMove);
window.addEventListener('mouseup', handleInputUp); // attach to window to catch fast drags

// Touch Event Listeners
canvas.addEventListener('touchstart', handleInputDown, {passive: false});
canvas.addEventListener('touchmove', handleInputMove, {passive: false});
window.addEventListener('touchend', handleInputUp);

async function triggerSingleRetake(index) {
    if(startBtn.disabled) return;
    startBtn.disabled = true;
    saveBtn.style.display = 'none';
    stickerMenu.style.display = 'none';
    
    await captureSingleFrame(index);
    finishCapturePhase();
}

// --- Saving ---
async function autoSaveRoutine() {
    printingOverlay.style.display = 'flex'; document.getElementById('printing-text').innerText = "Certified Kiyotie energy...";
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

saveBtn.addEventListener('click', async () => { 
    startBtn.disabled = true; // prevent interacting while "printing"
    await autoSaveRoutine();
    triggerStandardDownload(getFilename()); 
    photoCounter++; 
    
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "✅ Saved!";
    saveBtn.classList.add('saved-state');
    
    setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.classList.remove('saved-state');
        startBtn.disabled = false;
    }, 2500);
});

frameImage.onload = renderFinalCanvas; 
renderFinalCanvas(); // Initial draw

document.addEventListener('keydown', (event) => {
    if(screens.photobooth.classList.contains('active')) {
        if (event.code === 'Space') { event.preventDefault(); if (!startBtn.disabled) startBtn.click(); }
        if (event.code === 'KeyS' && saveBtn.style.display !== 'none') saveBtn.click();
    }
});