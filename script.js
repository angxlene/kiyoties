// ==========================================
// --- GLOBAL DATA & SETUP ---
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
    { id: 18, title: "MALAKAS", src: "audio/malakas.mp3" },
    { id: 19, title: "LALA", src: "audio/lala.mp3" },
    { id: 20, title: "Bangkok Freestyle", src: "audio/bangkok_freestyle.mp3" },
];

const TOTAL_SONGS = kiyoSongs.length;
const SKIP_INTRO_SECONDS = 20; 

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ui-total-1').innerText = TOTAL_SONGS;
    document.getElementById('ui-total-2').innerText = TOTAL_SONGS;
    document.getElementById('ui-total-3').innerText = TOTAL_SONGS;
    loadLeaderboard();
});

// --- Navigation & Audio Globals ---
const screens = {
    home: document.getElementById('home-screen'),
    game: document.getElementById('game-screen'),
    photobooth: document.getElementById('photobooth-screen')
};

const pbAudio = new Audio();
const gameAudio = new Audio();

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
    
    if(screenName === 'photobooth') {
        startCamera();
        playPhotoboothMusic();
    } else {
        stopPhotoboothMusic();
        if(video && video.srcObject) {
            video.srcObject.getTracks().forEach(t => t.stop());
            video.srcObject = null;
        }
    }
}

// --- Photobooth Audio ---
let pbPlaylist = [];

function playPhotoboothMusic() {
    if (!pbAudio.paused && pbAudio.currentTime > 0) return; 
    if (pbPlaylist.length === 0) pbPlaylist = [...kiyoSongs].sort(() => 0.5 - Math.random());
    
    const song = pbPlaylist.pop();
    pbAudio.src = song.src;
    pbAudio.volume = 0.4; 
    
    pbAudio.play().then(() => {
        pbAudio.currentTime = SKIP_INTRO_SECONDS;
    }).catch(e => console.log("Blocked by browser autoplay policies."));

    pbAudio.onended = () => playPhotoboothMusic();
}

function stopPhotoboothMusic() { 
    pbAudio.pause(); 
    pbAudio.currentTime = 0; 
}

// --- Event Listeners ---
document.getElementById('nav-photobooth').addEventListener('click', () => showScreen('photobooth'));
document.getElementById('nav-game').addEventListener('click', () => {
    checkDevicePlayedStatus();
    showScreen('game');
});
document.querySelectorAll('.nav-home').forEach(btn => {
    btn.addEventListener('click', () => {
        showScreen('home');
        gameAudio.pause(); gameAudio.currentTime = 0;
        clearTimeout(gameFlowTimeout);
        clearTimeout(timerInterval);
    });
});

// DEV TOOLS: Ctrl+Alt+D to Wipe, Ctrl+Alt+S to Preview Scorecard
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.code === 'KeyD') {
        if(confirm("Wipe all data?")) { localStorage.clear(); location.reload(); }
    }
    if (e.ctrlKey && e.altKey && e.code === 'KeyS') {
        playerName = "DEV_TEST"; currentScore = 17; totalTimeMs = 69080; generateScorecard();
    }
});

// ==========================================
// --- CHALLENGE LOGIC ---
// ==========================================
let currentScore = 0, totalTimeMs = 0, currentQuestionIndex = 0, randomizedPlaylist = [], playerName = "";
let gameFlowTimeout, timerInterval, roundStartTime = 0;

const startBtnGame = document.getElementById('start-game-btn');
const confirmStartBtn = document.getElementById('confirm-start-btn');
const backToHubBtn = document.getElementById('back-to-hub');
const leaderboardList = document.getElementById('leaderboard-list');
const timerFill = document.getElementById('timer-fill');

function loadLeaderboard() {
    let board = [];
    try {
        board = JSON.parse(localStorage.getItem('kiyotieLeaderboard')) || [];
    } catch (e) { board = []; }

    leaderboardList.innerHTML = '';
    if(board.length === 0) {
        leaderboardList.innerHTML = '<li>No challengers yet!</li>';
    } else {
        board.sort((a,b) => b.score - a.score || a.time - b.time)
             .slice(0, 10)
             .forEach((entry, i) => {
                leaderboardList.innerHTML += `
                    <li>
                        <span class="lb-rank">#${i+1}</span>
                        <span class="lb-name">${entry.name}</span> 
                        <span class="lb-stats"><span>${entry.score}</span>/${TOTAL_SONGS} in <span>${entry.time}s</span></span>
                    </li>`;
             });
    }
}

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

startBtnGame.addEventListener('click', () => {
    document.getElementById('game-start-panel').style.display = 'none';
    document.getElementById('instructions-panel').style.display = 'block';
});

confirmStartBtn.addEventListener('click', () => {
    const input = document.getElementById('player-name-input');
    if(!input.value.trim()) return alert("Enter fan name!");
    playerName = input.value.trim();
    localStorage.setItem('kiyotiePlayed', "true"); 
    backToHubBtn.style.display = 'none'; 
    document.getElementById('instructions-panel').style.display = 'none';
    startGame();
});

function runTimerBar(seconds) {
    timerFill.style.transition = 'none';
    timerFill.style.transform = 'scaleX(1)';
    void timerFill.offsetWidth; 
    timerFill.style.transition = `transform ${seconds}s linear`;
    timerFill.style.transform = 'scaleX(0)';
}

function startGame() {
    currentScore = 0; totalTimeMs = 0; currentQuestionIndex = 0;
    document.getElementById('progress-tracker').innerHTML = Array(TOTAL_SONGS).fill('<div class="progress-segment"></div>').join('');
    document.getElementById('game-play-panel').style.display = 'block';
    randomizedPlaylist = [...kiyoSongs].sort(() => 0.5 - Math.random());
    playRound();
}

function playRound() {
    if(currentQuestionIndex >= TOTAL_SONGS) return endGame();
    const song = randomizedPlaylist[currentQuestionIndex];
    
    document.getElementById('guessing-area').style.display = 'none';
    document.getElementById('feedback-display').style.display = 'none';
    document.getElementById('question-text').innerText = `🎵 Track ${currentQuestionIndex + 1}/${TOTAL_SONGS}`;
    document.getElementById('song-guess-input').value = "";
    runTimerBar(3);

    gameAudio.src = song.src;
    gameAudio.play().then(() => {
        gameAudio.currentTime = SKIP_INTRO_SECONDS;
        gameFlowTimeout = setTimeout(() => {
            gameAudio.pause();
            startGuessing();
        }, 3000);
    }).catch(e => {
        console.warn("Audio playback issue:", e);
        gameFlowTimeout = setTimeout(() => startGuessing(), 3000);
    });
}

function startGuessing() {
    document.getElementById('visualizer').style.opacity = '0.1';
    document.getElementById('question-text').innerText = "Type the title!";
    document.getElementById('guessing-area').style.display = 'block';
    const input = document.getElementById('song-guess-input');
    const btn = document.getElementById('submit-guess-btn');
    input.disabled = false; btn.disabled = false; input.focus();
    
    runTimerBar(10);
    roundStartTime = Date.now();
    timerInterval = setTimeout(() => processGuess(true), 10000);
}

document.getElementById('submit-guess-btn').addEventListener('click', () => processGuess(false));
document.getElementById('song-guess-input').addEventListener('keydown', (e) => { if(e.key === 'Enter') processGuess(false); });

function processGuess(isTimeout) {
    const btn = document.getElementById('submit-guess-btn');
    if (btn.disabled) return;
    btn.disabled = true;
    document.getElementById('song-guess-input').disabled = true;
    clearTimeout(timerInterval);

    let elapsed = Math.min(10000, Date.now() - roundStartTime);
    const song = randomizedPlaylist[currentQuestionIndex];
    const isCorrect = !isTimeout && document.getElementById('song-guess-input').value.trim().toLowerCase() === song.title.toLowerCase();

    const feedback = document.getElementById('feedback-display');
    feedback.style.display = 'block';
    const seg = document.getElementById('progress-tracker').children[currentQuestionIndex];

    if(isCorrect) {
        currentScore++;
        totalTimeMs += elapsed;
        feedback.style.color = "#00e676";
        feedback.innerHTML = `✅ Correct! "${song.title}"`;
        seg.classList.add('correct');
    } else {
        totalTimeMs += 10000;
        feedback.style.color = "var(--primary-pink)";
        feedback.innerHTML = `❌ Wrong! It was: "${song.title}" (+10s)`;
        seg.classList.add('incorrect');
    }

    document.getElementById('current-score').innerText = currentScore;
    document.getElementById('total-time-display').innerText = (totalTimeMs/1000).toFixed(2);
    
    document.getElementById('visualizer').style.opacity = '1';
    runTimerBar(10);
    gameAudio.play().catch(e => console.warn(e)); // Resume audio for feedback
    
    gameFlowTimeout = setTimeout(() => {
        currentQuestionIndex++;
        playRound();
    }, 10000);
}

function endGame() {
    backToHubBtn.style.display = 'block';
    document.getElementById('game-play-panel').style.display = 'none';
    document.getElementById('game-over-panel').style.display = 'block';
    
    const finalSecs = (totalTimeMs/1000).toFixed(2);
    document.getElementById('final-score').innerText = currentScore;
    document.getElementById('final-time').innerText = finalSecs;

    let board = [];
    try { board = JSON.parse(localStorage.getItem('kiyotieLeaderboard')) || []; } catch(e) {}
    board.push({ name: playerName, score: currentScore, time: parseFloat(finalSecs) });
    localStorage.setItem('kiyotieLeaderboard', JSON.stringify(board));
    
    if(typeof confetti === 'function') confetti({ particleCount: 200, colors: ['#ea8ca6', '#121212'] });
}

// ==========================================
// --- SCORECARD (FANMADE STYLE) ---
// ==========================================
function generateScorecard() {
    const canvas = document.getElementById('scorecard-canvas');
    const ctx = canvas.getContext('2d');
    const pink = "#ea8ca6";
    const dark = "#121212";

    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, 1080, 1920);

    const grd = ctx.createRadialGradient(540, 960, 100, 540, 960, 800);
    grd.addColorStop(0, "rgba(234, 140, 166, 0.15)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.textAlign = 'center';
    ctx.fillStyle = "white";
    ctx.font = 'bold 90px sans-serif';
    ctx.shadowColor = pink;
    ctx.shadowBlur = 20;
    ctx.fillText('KIYOTIES', 540, 300);
    ctx.shadowBlur = 0;

    ctx.font = '40px sans-serif';
    ctx.letterSpacing = "4px";
    ctx.fillStyle = pink;
    ctx.fillText('ULTIMATE FAN CHALLENGE', 540, 380);

    ctx.strokeStyle = pink;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(540, 850, 380, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(540, 850, 410, 0, Math.PI * 2); ctx.stroke();

    // Adjusted font size so "20/20" doesn't overflow
    ctx.fillStyle = "white";
    ctx.font = 'bold 220px sans-serif';
    ctx.fillText(`${currentScore}/${TOTAL_SONGS}`, 540, 920);

    ctx.font = '60px sans-serif';
    ctx.fillStyle = "#a8a8a8";
    const time = (totalTimeMs / 1000).toFixed(2);
    ctx.fillText(`in ${time} seconds`, 540, 1030);

    ctx.font = 'italic bold 80px sans-serif';
    ctx.fillStyle = "white";
    ctx.fillText(`@${playerName}`, 540, 1450);

    ctx.font = '40px sans-serif';
    ctx.fillStyle = pink;
    ctx.fillText('CAN YOU BEAT THIS?', 540, 1750);
    
    document.getElementById('scorecard-modal').style.display = 'flex';
}

document.getElementById('download-scorecard-btn').addEventListener('click', generateScorecard);
document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('scorecard-modal').style.display = 'none';
});
document.getElementById('save-scorecard-final').addEventListener('click', () => {
    const canvas = document.getElementById('scorecard-canvas');
    const link = document.createElement('a');
    link.download = `Kiyotie_Score_${playerName}.png`;
    link.href = canvas.toDataURL('image/png');
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

function renderFinalCanvas() {
    ctx.fillStyle = "#0f0c1b"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for(let i=0; i<3; i++) {
        if(capturedFrames[i]) {
            ctx.drawImage(capturedFrames[i], photoX, positions[i], photoWidth, photoHeight);
        }
    }
    
    if(frameImage.complete && frameImage.naturalHeight !== 0) {
        ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    activeStickers.forEach(st => {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 15;
        
        if (st.type === 'text') {
            ctx.font = `${st.size}px sans-serif`;
            ctx.fillText(st.content, st.x, st.y);
        } else if (st.type === 'image') {
            ctx.drawImage(
                st.imgElement, 
                st.x - (st.width / 2), 
                st.y - (st.height / 2), 
                st.width, 
                st.height
            );
        }
        ctx.restore();
    });
}

async function captureSingleFrame(index) {
    if (!video.videoWidth) {
        alert("Camera stream not ready yet!");
        return false;
    }

    posePrompt.innerText = `📸 Photo ${index + 1}`;
    posePrompt.style.opacity = 1;
    await runCountdown();
    
    const tempCanvas = document.createElement('canvas'); 
    tempCanvas.width = photoWidth; 
    tempCanvas.height = photoHeight;
    const tCtx = tempCanvas.getContext('2d'); 
    tCtx.translate(photoWidth, 0); 
    tCtx.scale(-1, 1);
    drawVideoCover(tCtx, video, 0, 0, photoWidth, photoHeight); 
    
    capturedFrames[index] = tempCanvas;
    renderFinalCanvas();

    snapTemp.src = tempCanvas.toDataURL(); snapTemp.style.display = 'block';
    flash.classList.remove('flash-fade'); flash.classList.add('flash-active');
    setTimeout(() => { flash.classList.remove('flash-active'); flash.classList.add('flash-fade'); }, 50);

    snapTemp.classList.remove('snap-anim'); void snapTemp.offsetWidth; snapTemp.classList.add('snap-anim');
    await sleep(800); snapTemp.style.display = 'none'; 
    return true;
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
            let success = await captureSingleFrame(i);
            if (!success) { startBtn.disabled = false; return; }
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
        if (btn.tagName.toLowerCase() === 'img') {
            activeStickers.push({
                type: 'image',
                imgElement: btn,
                x: canvas.width / 2,
                y: canvas.height / 2,
                width: 350, 
                height: 350 * (btn.naturalHeight / (btn.naturalWidth || 1)) || 350, 
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

    for(let i = activeStickers.length - 1; i >= 0; i--) {
        const st = activeStickers[i];
        let w, h;
        
        if (st.type === 'text') {
            ctx.font = `${st.size}px sans-serif`;
            w = ctx.measureText(st.content).width;
            h = st.size; 
        } else if (st.type === 'image') {
            w = st.width;
            h = st.height;
        }

        if(coords.x > st.x - w/2 && coords.x < st.x + w/2 &&
           coords.y > st.y - h/2 && coords.y < st.y + h/2) {
            draggingSticker = st;
            st.isDragging = true;
            dragOffsetX = coords.x - st.x;
            dragOffsetY = coords.y - st.y;
            
            activeStickers.splice(i, 1);
            activeStickers.push(st);
            return; 
        }
    }

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
        e.preventDefault(); 
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

canvas.addEventListener('mousedown', handleInputDown);
canvas.addEventListener('mousemove', handleInputMove);
window.addEventListener('mouseup', handleInputUp); 

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
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    startBtn.disabled = true; 
    
    await autoSaveRoutine();
    triggerStandardDownload(getFilename()); 
    photoCounter++; 
    
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "✅ Saved!";
    saveBtn.classList.add('saved-state');
    
    setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.classList.remove('saved-state');
        saveBtn.disabled = false;
        startBtn.disabled = false;
    }, 2500);
});

frameImage.onload = renderFinalCanvas; 
renderFinalCanvas(); 

document.addEventListener('keydown', (event) => {
    if(screens.photobooth.classList.contains('active')) {
        if (event.code === 'Space') { event.preventDefault(); if (!startBtn.disabled) startBtn.click(); }
        if (event.code === 'KeyS' && saveBtn.style.display !== 'none' && !saveBtn.disabled) saveBtn.click();
    }
});