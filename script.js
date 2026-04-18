import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD3ydM--P1nToreODU9pOx8gSAdD0Nc3rk",
    authDomain: "kiyoties-fanzone.firebaseapp.com",
    projectId: "kiyoties-fanzone",
    storageBucket: "kiyoties-fanzone.firebasestorage.app",
    messagingSenderId: "958852905579",
    appId: "1:958852905579:web:3be14e5092903c288b4f2e",
    measurementId: "G-NL14K07WC8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    const lbRef = collection(db, "leaderboard");
    // Query ONLY by score to bypass the Firebase Composite Index block.
    // We pull the top 50 scores, then break ties using 'time' locally.
    const q = query(lbRef, orderBy("score", "desc"), limit(50));

    // Real-time listener
    onSnapshot(q, (snapshot) => {
        leaderboardList.innerHTML = '';
        if (snapshot.empty) {
            leaderboardList.innerHTML = '<li>No challengers yet!</li>';
            return;
        }

        let entries = [];
        snapshot.forEach((doc) => {
            entries.push(doc.data());
        });

        // Client-side local sort: Highest score first, then lowest time
        entries.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Descending score
            }
            return a.time - b.time; // Ascending time
        });

        // Take only the top 10 after the local sort is applied
        const top10 = entries.slice(0, 10);

        top10.forEach((entry, i) => {
            const li = document.createElement('li');
            
            // Build the safe HTML structure first
            li.innerHTML = `
                <span class="lb-rank">#${i+1}</span>
                <span class="lb-name"></span> 
                <span class="lb-stats"><span>${entry.score}</span>/${TOTAL_SONGS} in <span>${entry.time}s</span></span>
            `;
            
            // Safely inject the user-generated string as text to prevent XSS
            li.querySelector('.lb-name').textContent = entry.name;
            
            leaderboardList.appendChild(li);
        });
    }, (error) => {
        console.error("Error fetching leaderboard:", error);
        leaderboardList.innerHTML = '<li>Cannot connect to server. Check Firebase Indexes!</li>';
    });
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

function normalizeString(str) {
    return str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s{2,}/g, " ").trim();
}

function processGuess(isTimeout) {
    const btn = document.getElementById('submit-guess-btn');
    if (btn.disabled) return;
    btn.disabled = true;
    document.getElementById('song-guess-input').disabled = true;
    clearTimeout(timerInterval);

    let elapsed = Math.min(10000, Date.now() - roundStartTime);
    const song = randomizedPlaylist[currentQuestionIndex];
    
    const userGuess = normalizeString(document.getElementById('song-guess-input').value);
    const correctTitle = normalizeString(song.title);
    const isCorrect = !isTimeout && userGuess === correctTitle;

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
    gameAudio.play().catch(e => console.warn(e)); 
    
    gameFlowTimeout = setTimeout(() => {
        currentQuestionIndex++;
        playRound();
    }, 10000);
}

async function endGame() {
    backToHubBtn.style.display = 'block';
    document.getElementById('game-play-panel').style.display = 'none';
    document.getElementById('game-over-panel').style.display = 'block';
    
    const finalSecs = (totalTimeMs/1000).toFixed(2);
    document.getElementById('final-score').innerText = currentScore;
    document.getElementById('final-time').innerText = finalSecs;

    try {
        await addDoc(collection(db, "leaderboard"), {
            name: playerName,
            score: currentScore,
            time: parseFloat(finalSecs),
            timestamp: serverTimestamp() 
        });
    } catch (e) {
        console.error("Error saving score to Firebase: ", e);
    }
    
    if(typeof confetti === 'function') confetti({ particleCount: 200, colors: ['#ea8ca6', '#121212'] });
}

// ==========================================
// --- SCORECARD (FANMADE STYLE) ---
// ==========================================
function generateScorecard() {
    const canvas = document.getElementById('scorecard-canvas');
    const ctx = canvas.getContext('2d');
    
    const pink = "#ea8ca6";
    const darkLeather = "#121212";
    const silver = "#a8a8a8";
    const white = "#ffffff";

    ctx.fillStyle = darkLeather;
    ctx.fillRect(0, 0, 1080, 1920);

    const glow1 = ctx.createRadialGradient(200, 200, 50, 200, 200, 800);
    glow1.addColorStop(0, "rgba(234, 140, 166, 0.4)");
    glow1.addColorStop(1, "transparent");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1080, 1920);

    const glow2 = ctx.createRadialGradient(880, 1700, 50, 880, 1700, 800);
    glow2.addColorStop(0, "rgba(234, 140, 166, 0.3)");
    glow2.addColorStop(1, "transparent");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    
    ctx.beginPath();
    ctx.roundRect(90, 150, 900, 1620, 40); 
    ctx.fillStyle = white;
    ctx.fill();
    ctx.restore();

    const cardBg = ctx.createLinearGradient(90, 150, 90, 1770);
    cardBg.addColorStop(0, "#ffffff");
    cardBg.addColorStop(1, "#f2f2f2");
    ctx.fillStyle = cardBg;
    ctx.fill(); 

    ctx.textAlign = 'center';
    ctx.fillStyle = darkLeather;
    ctx.font = '900 85px system-ui, sans-serif';
    ctx.fillText('KIYOTIES', 540, 310);

    ctx.fillStyle = pink;
    ctx.font = '800 35px system-ui, sans-serif';
    ctx.letterSpacing = "6px";
    ctx.fillText('ULTIMATE FAN CHALLENGE', 540, 380);
    ctx.letterSpacing = "0px";

    ctx.strokeStyle = "rgba(234, 140, 166, 0.15)";
    ctx.lineWidth = 25;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(540, 800, 260, 0, Math.PI * 2);
    ctx.stroke();

    const percentage = currentScore / TOTAL_SONGS;
    const endAngle = (Math.PI * 2 * percentage) - (Math.PI / 2);
    
    ctx.strokeStyle = pink;
    ctx.lineWidth = 25;
    ctx.beginPath();
    ctx.arc(540, 800, 260, -Math.PI / 2, endAngle);
    ctx.stroke();

    ctx.strokeStyle = "rgba(18, 18, 18, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(540, 800, 310, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = darkLeather;
    ctx.font = '900 220px system-ui, sans-serif';
    ctx.fillText(currentScore, 540, 840);
    
    ctx.fillStyle = silver;
    ctx.font = '800 60px system-ui, sans-serif';
    ctx.fillText(`OUT OF ${TOTAL_SONGS}`, 540, 940);

    let rank = "TRUE KIYOTIE";
    if(currentScore <= 5) rank = "CASUAL LISTENER";
    if(currentScore === TOTAL_SONGS) rank = "ULTIMATE SUPERFAN";

    ctx.fillStyle = pink;
    ctx.beginPath();
    ctx.roundRect(310, 1200, 460, 80, 40); 
    ctx.fill();
    
    ctx.fillStyle = white;
    ctx.font = 'bold 35px system-ui, sans-serif';
    ctx.fillText(rank, 540, 1253);

    const time = (totalTimeMs / 1000).toFixed(2);
    ctx.fillStyle = silver;
    ctx.font = '600 45px system-ui, sans-serif';
    ctx.fillText(`Completed in ${time} seconds`, 540, 1340);

    ctx.fillStyle = darkLeather;
    ctx.font = 'italic 800 70px system-ui, sans-serif';
    ctx.fillText(playerName, 540, 1480);
    
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(240, 1550);
    ctx.lineTo(840, 1550);
    ctx.stroke();

    ctx.fillStyle = pink;
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText('CAN YOU BEAT MY SCORE?', 540, 1630);
    
    ctx.fillStyle = silver;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.letterSpacing = "2px";
    ctx.fillText('PREPARED & DEVELOPED BY DAILY KIYO CONTENT', 540, 1710);
    ctx.letterSpacing = "0px"; 
    
    const stickers = document.querySelectorAll('.img-sticker');
    if (stickers.length >= 2) {
        function drawSticker(img, x, y, angle, maxDim) {
            const ratio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
            let w, h;
            if (ratio > 1) { 
                w = maxDim;
                h = maxDim / ratio;
            } else { 
                h = maxDim;
                w = maxDim * ratio;
            }
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle * Math.PI / 180);
            
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = 20;
            ctx.shadowOffsetY = 15;
            
            ctx.drawImage(img, -w/2, -h/2, w, h);
            ctx.restore();
        }

        drawSticker(stickers[0], 850, 240, 12, 280); 
        drawSticker(stickers[1], 230, 1480, -15, 320);
    }

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
const stickerEditControls = document.getElementById('sticker-edit-controls');
const undoStickerBtn = document.getElementById('undo-sticker-btn');
const clearStickersBtn = document.getElementById('clear-stickers-btn');

const photoWidth = 920;  
const photoHeight = 473; 
const photoX = 80;       
const positions = [290, 773, 1256];

let photoCounter = 1; 
let capturedFrames = [null, null, null];
let activeStickers = [];
let draggingSticker = null;
let dragOffsetX = 0, dragOffsetY = 0;
let previousTouchAngle = null; 

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

// Controls visibility toggle for Undo & Clear All
function updateStickerControls() {
    if (activeStickers.length > 0) {
        stickerEditControls.style.display = 'flex';
    } else {
        stickerEditControls.style.display = 'none';
    }
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
        ctx.translate(st.x, st.y);
        ctx.rotate(st.rotation);
        
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 15;
        
        if (st.type === 'text') {
            ctx.font = `${st.size}px sans-serif`;
            ctx.fillText(st.content, 0, 0); 
        } else if (st.type === 'image') {
            ctx.drawImage(
                st.imgElement, 
                -st.width / 2, 
                -st.height / 2, 
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
        updateStickerControls();
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
    
    posePrompt.innerText = "Tap to add stickers or drag them in! ✨";
    posePrompt.style.opacity = 1;
    setTimeout(() => { posePrompt.style.opacity = 0; }, 4000); 
}

// --- Sticker Logic: Addition & Drag-and-Drop ---
function addStickerToCanvas(btn, x, y) {
    if (btn.tagName.toLowerCase() === 'img') {
        activeStickers.push({
            type: 'image',
            imgElement: btn,
            x: x,
            y: y,
            width: 350, 
            height: 350 * (btn.naturalHeight / (btn.naturalWidth || 1)) || 350, 
            rotation: 0,
            isDragging: false
        });
    } else {
        activeStickers.push({
            type: 'text',
            content: btn.innerText,
            x: x,
            y: y,
            size: 200, 
            rotation: 0,
            isDragging: false
        });
    }
    updateStickerControls();
    renderFinalCanvas();
}

document.querySelectorAll('.sticker-btn').forEach((btn, index) => {
    btn.draggable = true;
    btn.dataset.index = index;

    // Desktop: Drag from menu
    btn.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('sticker-index', index);
    });

    // Mobile/Desktop: Tap to add at center
    btn.addEventListener('click', () => {
        addStickerToCanvas(btn, canvas.width / 2, canvas.height / 2);
    });
});

// Allow dropping stickers onto the canvas
canvas.addEventListener('dragover', (e) => {
    e.preventDefault(); 
});

canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (startBtn.disabled || capturedFrames.includes(null)) return;
    const index = e.dataTransfer.getData('sticker-index');
    if (index !== "") {
        const btn = document.querySelectorAll('.sticker-btn')[index];
        const coords = getCanvasCoordinates(e);
        addStickerToCanvas(btn, coords.x, coords.y);
    }
});

// --- UNDO AND CLEAR LOGIC ---
undoStickerBtn.addEventListener('click', () => {
    if (startBtn.disabled) return; 
    if (activeStickers.length > 0) {
        activeStickers.pop(); 
        updateStickerControls();
        renderFinalCanvas();
    }
});

clearStickersBtn.addEventListener('click', () => {
    if (startBtn.disabled) return; 
    if (activeStickers.length > 0) {
        activeStickers = []; 
        updateStickerControls();
        renderFinalCanvas();
    }
});

// Robust Canvas Coordinates Calculation (fixes NaN disappearance issue)
function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX = 0;
    let clientY = 0;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else if (e.clientX !== undefined) {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('wheel', (e) => {
    if(startBtn.disabled || capturedFrames.includes(null)) return;
    
    const coords = getCanvasCoordinates(e);
    let target = draggingSticker; 
    
    if (!target) {
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

            const dx = coords.x - st.x;
            const dy = coords.y - st.y;
            const unrotatedX = dx * Math.cos(-st.rotation) - dy * Math.sin(-st.rotation);
            const unrotatedY = dx * Math.sin(-st.rotation) + dy * Math.cos(-st.rotation);

            if(unrotatedX > -w/2 && unrotatedX < w/2 && unrotatedY > -h/2 && unrotatedY < h/2) {
                target = st;
                break;
            }
        }
    }
    
    if (target) {
        e.preventDefault(); 
        target.rotation += Math.sign(e.deltaY) * 0.15; 
        renderFinalCanvas();
    }
}, {passive: false});

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

        const dx = coords.x - st.x;
        const dy = coords.y - st.y;
        const unrotatedX = dx * Math.cos(-st.rotation) - dy * Math.sin(-st.rotation);
        const unrotatedY = dx * Math.sin(-st.rotation) + dy * Math.cos(-st.rotation);

        if(unrotatedX > -w/2 && unrotatedX < w/2 && unrotatedY > -h/2 && unrotatedY < h/2) {
            if (e.cancelable) e.preventDefault(); // crucial to prevent ghost touch double-firing
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
            if (e.cancelable) e.preventDefault(); 
            triggerSingleRetake(i);
            return;
        }
    }
}

function handleInputMove(e) {
    if(draggingSticker) {
        if (e.cancelable) e.preventDefault(); 
        
        if (e.touches && e.touches.length === 2) {
            const dx = e.touches[1].clientX - e.touches[0].clientX;
            const dy = e.touches[1].clientY - e.touches[0].clientY;
            const angle = Math.atan2(dy, dx);
            
            if (previousTouchAngle !== null) {
                draggingSticker.rotation += (angle - previousTouchAngle);
            }
            previousTouchAngle = angle;
            renderFinalCanvas();
            return; 
        } else {
            previousTouchAngle = null;
        }

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
        previousTouchAngle = null;
    }
}

canvas.addEventListener('mousedown', handleInputDown);
canvas.addEventListener('mousemove', handleInputMove);
window.addEventListener('mouseup', handleInputUp); 

// passive: false is required so preventDefault() stops mobile ghost scrolling
canvas.addEventListener('touchstart', handleInputDown, {passive: false});
canvas.addEventListener('touchmove', handleInputMove, {passive: false});
window.addEventListener('touchend', handleInputUp);

async function triggerSingleRetake(index) {
    if(startBtn.disabled) return;
    startBtn.disabled = true;
    saveBtn.style.display = 'none';
    stickerMenu.style.display = 'none';
    stickerEditControls.style.display = 'none';
    
    await captureSingleFrame(index);
    finishCapturePhase();
    updateStickerControls(); // Show buttons again if stickers are left
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