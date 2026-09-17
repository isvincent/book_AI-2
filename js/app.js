// Global Variables
let player;
let isUserLoggedIn = false;
let chatHistory = [];
let learningNotes = [];

// Sound Elements
const sounds = {
    click: document.getElementById('clickSound'),
    chime: document.getElementById('chimeSound'),
    success: document.getElementById('successSound')
};

// Play sound helper
function playSound(type) {
    if (sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].play().catch(e => console.log('Sound play blocked by browser:', e));
    }
}

// ----------------------------------------------------------------------
// YouTube IFrame Player API
// ----------------------------------------------------------------------
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        playerVars: {
            listType: 'playlist',
            list: 'PLRLj8B40-Dx0'
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    // 當影片結束時 (State = 0)，加入筆記提示
    if (event.data === YT.PlayerState.ENDED) {
        playSound('success');
        let currentVideoIndex = player.getPlaylistIndex();
        let msg = `恭喜你看完第 ${currentVideoIndex + 1} 部影片！記得在學習筆記中寫下心得喔。`;
        addBotMessage(msg);
    }
}

// ----------------------------------------------------------------------
// Login / Logout (Simulation)
// ----------------------------------------------------------------------
function simulateLogin() {
    playSound('success');
    isUserLoggedIn = true;
    
    // Update UI
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('userInfo').classList.remove('hidden');
    
    // Enable main content
    const mainContent = document.getElementById('mainContent');
    mainContent.classList.remove('opacity-50', 'pointer-events-none');
    
    // Load local storage data
    loadLocalData();
    
    addBotMessage('登入成功！歡迎來到學習空間，準備好開始看說書了嗎？');
}

function logout() {
    playSound('click');
    isUserLoggedIn = false;
    
    // Update UI
    document.getElementById('loginBtn').classList.remove('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    
    // Disable main content
    const mainContent = document.getElementById('mainContent');
    mainContent.classList.add('opacity-50', 'pointer-events-none');
}

// ----------------------------------------------------------------------
// Learning Notes
// ----------------------------------------------------------------------
function addNote() {
    playSound('click');
    if (!isUserLoggedIn) return;
    
    const note = prompt("請輸入你的學習心得：");
    if (note && note.trim() !== "") {
        learningNotes.push(note.trim());
        saveLocalData();
        renderNotes();
    }
}

function renderNotes() {
    const list = document.getElementById('notesList');
    list.innerHTML = '';
    if (learningNotes.length === 0) {
        list.innerHTML = '<li class="text-gray-500 italic">尚無筆記，點擊「新增心得」來記錄你的想法吧！</li>';
        return;
    }
    
    learningNotes.forEach((note, index) => {
        const li = document.createElement('li');
        li.className = 'bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center msg-animate';
        li.innerHTML = `
            <span>${note}</span>
            <button class="text-red-400 hover:text-red-600 ml-2" onclick="deleteNote(${index})" title="刪除">
                <i class="fas fa-trash"></i>
            </button>
        `;
        list.appendChild(li);
    });
}

function deleteNote(index) {
    playSound('click');
    learningNotes.splice(index, 1);
    saveLocalData();
    renderNotes();
}

// ----------------------------------------------------------------------
// AI Chat
// ----------------------------------------------------------------------
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (message === '') return;
    
    playSound('click');
    
    // Add user message to UI
    addUserMessage(message);
    input.value = '';
    
    // Record in history
    chatHistory.push({ sender: 'user', text: message });
    saveLocalData();
    
    // Show loading
    const loadingId = addLoadingIndicator();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: message,
                history: chatHistory.slice(-10) // Only send recent history to save tokens
            })
        });
        
        const data = await response.json();
        removeElement(loadingId);
        
        if (response.ok) {
            playSound('chime');
            const aiText = data.response;
            addBotMessage(aiText);
            chatHistory.push({ sender: 'model', text: aiText });
            saveLocalData();
        } else {
            addBotMessage(`發生錯誤：${data.error}`);
        }
    } catch (error) {
        removeElement(loadingId);
        addBotMessage("網路錯誤，無法連接到伺服器，請稍後再試。");
        console.error('Chat Error:', error);
    }
}

function addUserMessage(text) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'flex items-end justify-end msg-animate';
    msgDiv.innerHTML = `
        <div class="bg-yellow-400 rounded-lg p-3 max-w-[80%] shadow-sm rounded-tr-none border border-yellow-500">
            <p class="text-lg text-yellow-900">${text}</p>
        </div>
    `;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addBotMessage(text) {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'flex items-start msg-animate mt-4';
    
    // Format text (simple newlines to br for basic formatting)
    const formattedText = text.replace(/\n/g, '<br>');
    
    msgDiv.innerHTML = `
        <div class="bg-blue-100 rounded-lg p-3 max-w-[80%] shadow-sm rounded-tl-none border border-blue-200 text-lg">
            ${formattedText}
        </div>
    `;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'flex items-start mt-4';
    msgDiv.innerHTML = `
        <div class="bg-gray-100 rounded-lg p-3 shadow-sm rounded-tl-none border border-gray-200">
            <div class="dot-flashing"></div>
        </div>
    `;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ----------------------------------------------------------------------
// Export & Local Storage
// ----------------------------------------------------------------------
function saveLocalData() {
    localStorage.setItem('storyteller_notes', JSON.stringify(learningNotes));
    localStorage.setItem('storyteller_chat', JSON.stringify(chatHistory));
}

function loadLocalData() {
    const savedNotes = localStorage.getItem('storyteller_notes');
    const savedChat = localStorage.getItem('storyteller_chat');
    
    if (savedNotes) {
        learningNotes = JSON.parse(savedNotes);
        renderNotes();
    }
    if (savedChat) {
        chatHistory = JSON.parse(savedChat);
        // Only render the last few messages if there's a lot, or all. Let's render all.
        // Wait, rendering all might duplicate welcome message.
        // For simplicity, we just clear chat and re-render.
        const chatBox = document.getElementById('chatBox');
        chatBox.innerHTML = '';
        chatHistory.forEach(msg => {
            if (msg.sender === 'user') addUserMessage(msg.text);
            else addBotMessage(msg.text);
        });
    }
}

async function downloadWord() {
    playSound('click');
    if (chatHistory.length === 0 && learningNotes.length === 0) {
        alert("目前還沒有學習紀錄可以下載喔！");
        return;
    }
    
    try {
        // Show loading in button
        const btn = document.querySelector('button[title="下載為 Word"]');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin text-2xl"></i>';
        
        const response = await fetch('/api/export-word', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                history: chatHistory,
                notes: learningNotes
            })
        });
        
        btn.innerHTML = originalHtml;
        
        if (response.ok) {
            playSound('success');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = '學習歷程紀錄.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            alert("下載失敗，請稍後再試。");
        }
    } catch (error) {
        console.error("Export Error:", error);
        alert("網路錯誤，無法下載檔案。");
    }
}

// Ensure all inputs ignore keypress if not logged in
document.getElementById('userInput').addEventListener('focus', function() {
    if (!isUserLoggedIn) {
        this.blur();
        alert('請先使用 Google 登入才能發送訊息喔！');
    }
});
