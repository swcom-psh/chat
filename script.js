const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const loadingIndicator = document.getElementById('loading');
const loginScreen = document.getElementById('login-screen');
const appContainer = document.querySelector('.app-container');

// ==========================================
// ⚙️ 환경 설정 (선생님이 직접 입력해야 하는 부분)
// ==========================================
// 1. Google Cloud - OAuth 클라이언트 ID
const GOOGLE_CLIENT_ID = "455099474641-0j7codhi77g21tg778s8j54lqb69ple9.apps.googleusercontent.com";

// 2. Google Apps Script - 웹앱 URL
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwzeZipzrMKJ3fepJi9oHuMLnwXNaJUH6UDhKMF66J-Z2gEmOlnrqxmSBeFlNeXewupMA/exec";

// 현재 로그인한 사용자 정보 저장
let currentUser = {
    studentId: "",
    name: "",
    email: ""
};

// ==========================================
// 🔐 구글 로그인 처리
// ==========================================
window.onload = function () {
    if(GOOGLE_CLIENT_ID.includes("여기에_구글_클라이언트_ID를_입력하세요")) {
        console.warn("구글 로그인 Client ID가 설정되지 않았습니다.");
    }

    // Google Identity Services 초기화
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        hosted_domain: "sdhs.gwe.hs.kr" // 이 도메인으로만 로그인 제한
    });
    google.accounts.id.renderButton(
        document.getElementById("google-login-btn-container"),
        { theme: "outline", size: "large", text: "signin_with" }
    );
};

// 로그인 성공 시 콜백
function handleCredentialResponse(response) {
    const responsePayload = decodeJwtResponse(response.credential);
    
    // 도메인 검증
    if (responsePayload.hd !== "sdhs.gwe.hs.kr") {
        alert("학교 공식 계정(@sdhs.gwe.hs.kr)으로만 접속할 수 있습니다.");
        google.accounts.id.revoke(responsePayload.email, () => {});
        return;
    }
    
    // 이메일에서 학번 추출
    const email = responsePayload.email;
    const studentId = email.split('@')[0];
    const name = responsePayload.name;
    
    currentUser = { studentId, name, email };
    
    // 메인 화면으로 전환
    loginScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    
    appendMessage(`환영합니다, **${name}**(${studentId}) 학생! 👋\n무엇을 도와드릴까요?`, 'ai');
}

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// ==========================================
// 🤖 챗봇 기본 로직 (API 키 없음 - 보안 통신)
// ==========================================
let conversationHistory = [];

const systemInstruction = `당신은 파이썬 데이터 분석 및 시각화를 배우는 학생들을 위한 친절한 튜터(도우미)입니다.

[주요 교육 범위]
1. pandas 모듈 활용: loc 함수, 조건 필터링, groupby, 숫자 통계(mean, min, max 등) 문법
2. 데이터 시각화 라이브러리: plotly, folium, pyvis

[핵심 역할 및 스캐폴딩(Scaffolding) 규칙 - 매우 중요]
1. 정답 코드 금지: 학생이 질문했을 때, **절대 완성된 정답 코드나 복사해서 바로 쓸 수 있는 전체 코드를 제공하지 마세요.**
2. 단계별 힌트 제공: 문제 해결을 위한 단계를 나누고, 학생이 스스로 생각할 수 있도록 힌트를 주세요.
3. 소크라테스식 질문: "이 부분에서는 어떤 함수를 써야 할까요?", "이 조건식을 코드로 어떻게 표현할 수 있을까요?" 와 같이 질문을 던져 학생의 답변을 유도하세요.
4. 문법 구조 안내: 빈칸이 뚫린 코드(Blank code)나 문법의 기본 형태(예: df.loc[ 조건식 ])만 제공하여 학생이 직접 고민하고 채워 넣을 수 있게 하세요.
5. 긍정적 피드백: 학생이 시도한 코드나 답변에 대해 칭찬하고, 틀린 부분이 있다면 원리를 친절하게 설명하여 스스로 수정할 수 있게 유도하세요.
6. 응답 형식: 답변 시 가독성 좋게 마크다운 형식을 활용하세요.`;

conversationHistory.push({
    role: "system",
    content: systemInstruction
});

async function getGPTResponse(message) {
    if (GAS_WEB_APP_URL.includes("여기에_앱스스크립트")) {
        return "GAS Web App URL이 설정되지 않았습니다. 관리자에게 문의하세요.";
    }

    conversationHistory.push({
        role: "user",
        content: message
    });

    const payload = {
        studentId: currentUser.studentId,
        name: currentUser.name,
        messages: conversationHistory
    };

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // CORS 이슈 우회
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            console.error(data.error);
            return "오류가 발생했습니다: " + data.error;
        }

        const replyText = data.reply;
        
        conversationHistory.push({
            role: "assistant",
            content: replyText
        });

        return replyText;
    } catch (error) {
        console.error("API Error:", error);
        return "네트워크 오류가 발생했습니다. 구글 앱스 스크립트 연결을 확인해주세요.";
    }
}

function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender);
    
    if (sender === 'ai' && typeof marked !== 'undefined') {
        messageDiv.innerHTML = marked.parse(text);
    } else {
        messageDiv.textContent = text;
    }
    
    chatContainer.insertBefore(messageDiv, loadingIndicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageDiv;
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    userInput.value = '';
    
    loadingIndicator.style.display = 'flex';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const response = await getGPTResponse(text);
    
    loadingIndicator.style.display = 'none';
    appendMessage(response, 'ai');
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSend();
    }
});

// ==========================================
// 📂 파일 첨부 및 드래그 앤 드롭 처리 (CSV, Excel)
// ==========================================
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const dragOverlay = document.getElementById('drag-overlay');

attachBtn.addEventListener('click', () => { fileInput.click(); });

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
});

appContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragOverlay.classList.add('active');
});

appContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (e.target === dragOverlay || e.target === appContainer) {
        dragOverlay.classList.remove('active');
    }
});

appContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    dragOverlay.classList.remove('active');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
    }
});

function handleFileUpload(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const loadingMsg = appendMessage(`파일 분석 중... (${file.name})`, 'ai');

    if (ext === 'csv') {
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: function(results) { processParsedData(file.name, results.data, loadingMsg); },
            error: function(err) { loadingMsg.innerHTML = "CSV 파일을 읽는 중 오류가 발생했습니다."; }
        });
    } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet);
            processParsedData(file.name, json, loadingMsg);
        };
        reader.readAsArrayBuffer(file);
    } else {
        loadingMsg.innerHTML = "지원하지 않는 파일 형식입니다. CSV 또는 Excel 파일을 올려주세요.";
    }
    fileInput.value = '';
}

function processParsedData(filename, dataArray, loadingMsgElement) {
    if (!dataArray || dataArray.length === 0) {
        loadingMsgElement.innerHTML = "파일에 데이터가 없습니다.";
        return;
    }

    const columns = Object.keys(dataArray[0]);
    const sampleData = dataArray.slice(0, 3);
    
    const dataContext = `[시스템 알림: 학생이 데이터를 업로드했습니다]
파일명: ${filename}
총 데이터 수: ${dataArray.length}행
컬럼명: ${columns.join(', ')}
데이터 예시(상위 3줄):
${JSON.stringify(sampleData, null, 2)}

이 데이터를 바탕으로 학생에게 데이터를 잘 확인했다고 인사하고, 이 데이터로 어떤 분석이나 시각화를 하고 싶은지 친절하게 물어보세요.`;

    loadingMsgElement.innerHTML = `✅ <b>${filename}</b> 파일이 성공적으로 첨부되었습니다!<br>AI가 데이터를 파악하고 있습니다...`;
    fetchDataAnalysisGreeting(dataContext, loadingMsgElement);
}

async function fetchDataAnalysisGreeting(context, loadingMsgElement) {
    if (GAS_WEB_APP_URL.includes("여기에_앱스스크립트")) {
        loadingMsgElement.innerHTML = "GAS Web App URL이 설정되지 않았습니다. 관리자에게 문의하세요.";
        return;
    }

    conversationHistory.push({ role: "user", content: context });

    const payload = {
        studentId: currentUser.studentId,
        name: currentUser.name,
        messages: conversationHistory
    };

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            loadingMsgElement.innerHTML = "오류가 발생했습니다: " + data.error;
            return;
        }

        const replyText = data.reply;
        conversationHistory.push({ role: "assistant", content: replyText });

        if (typeof marked !== 'undefined') loadingMsgElement.innerHTML = marked.parse(replyText);
        else loadingMsgElement.textContent = replyText;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (error) {
        console.error(error);
        loadingMsgElement.innerHTML = "네트워크 오류가 발생했습니다.";
    }
}
