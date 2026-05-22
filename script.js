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
    
    appendMessage(`환영합니다, **${name}**(${studentId}) 학생! 👋\n시원한 바다처럼 파이썬 고민을 해결해 드릴게요!`, 'ai');
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

function renderMarkdown(element, text) {
    if (typeof marked !== 'undefined') {
        element.innerHTML = marked.parse(text);
        addCopyButtons(element);
    } else {
        element.textContent = text;
    }
}

function addCopyButtons(container) {
    const preElements = container.querySelectorAll('pre');
    preElements.forEach(pre => {
        const codeElement = pre.querySelector('code');
        if (codeElement) {
            if (pre.querySelector('.copy-btn')) return;

            const copyBtn = document.createElement('button');
            copyBtn.classList.add('copy-btn');
            copyBtn.textContent = '복사';
            
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(codeElement.textContent);
                    copyBtn.textContent = '완료!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = '복사';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error('복사 실패:', err);
                    copyBtn.textContent = '실패';
                }
            });
            
            pre.appendChild(copyBtn);
        }
    });
}

function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender);
    
    if (sender === 'ai') {
        renderMarkdown(messageDiv, text);
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

        renderMarkdown(loadingMsgElement, replyText);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (error) {
        console.error(error);
        loadingMsgElement.innerHTML = "네트워크 오류가 발생했습니다.";
    }
}

// ==========================================
// 💡 FAQ 사이드바 클릭 처리 (API 미사용, 즉시 답변)
// ==========================================
const faqData = {
    faq1: {
        q: "판다스로 엑셀(Excel)이나 CSV 파일을 불러오는 방법(read_excel, read_csv)을 알려주세요.",
        a: "데이터를 분석하려면 가장 먼저 파일을 불러와야겠죠? 📁\n\n판다스에서는 `read_csv`와 `read_excel` 함수를 사용합니다.\n\n### 기본 문법\n```python\nimport pandas as pd\n\n# CSV 파일 불러오기 (한글이 깨질 때 encoding 옵션 사용!)\ndf = pd.read_csv('파일명.csv', encoding='cp949') # 또는 'utf-8'\n\n# 엑셀 파일 불러오기 (첫 번째 줄이 열 이름이 아닐 때 header 옵션 사용!)\ndf = pd.read_excel('파일명.xlsx', header=1) # 1번째 인덱스(두 번째 줄)를 열 이름으로 지정\n```\n\n`header=None`을 주면 열 이름 없이 데이터를 불러올 수도 있답니다!"
    },
    faq2: {
        q: "데이터프레임에서 특정 행이나 열을 선택할 때 사용하는 loc와 iloc의 차이점과 활용법을 설명해주세요.",
        a: "특정 데이터를 콕 집어서 가져올 때 `loc`와 `iloc`를 사용합니다! 🎯\n\n- **`loc`**: 행/열의 **이름(라벨)**을 사용해서 가져옵니다.\n- **`iloc`**: 행/열의 **순서(숫자 인덱스)**를 사용해서 가져옵니다.\n\n### 기본 문법\n```python\n# 1. loc 활용 (이름 기준)\ndf.loc[행_조건, '열_이름']\n\n# 예: 나이가 15살 이상인 사람의 이름 찾기\ndf.loc[df['나이'] >= 15, '이름']\n\n# 2. iloc 활용 (숫자 기준)\ndf.iloc[0:3, 1]  # 0~2번째 행, 1번째 열 가져오기\n```\n\n어떤 조건으로 필터링을 하고 싶으신가요? 조건을 알려주시면 힌트를 드릴게요!"
    },
    faq3: {
        q: "데이터를 그룹화해서 통계를 낼 때 사용하는 groupby 함수는 어떻게 쓰나요?",
        a: "반별 평균, 성별 합계 등 **'~별'** 통계가 필요할 때는 `groupby`를 씁니다! 📊\n\n### 기본 문법\n```python\n# df.groupby('기준이_되는_열')['계산할_열'].통계함수()\n\n# 예: '반'별로 '수학' 점수의 평균 구하기\ndf.groupby('반')['수학'].mean()\n```\n\n여러분은 어떤 데이터를 기준으로 묶어서 통계를 내고 싶나요?"
    },
    faq4: {
        q: "데이터의 평균(mean), 최솟값(min), 최댓값(max) 등 기본 통계를 구하는 방법을 알려주세요.",
        a: "판다스에서는 데이터의 통계를 아주 쉽게 구할 수 있어요! 🧮\n\n### 자주 쓰는 통계 함수\n- `.mean()` : 평균\n- `.sum()` : 합계\n- `.max()` : 최댓값\n- `.min()` : 최솟값\n- `.count()` : 개수\n\n### 사용 예시\n```python\n# 특정 열의 평균 구하기\ndf['국어'].mean()\n```\n\n여러 함수를 한 번에 보고 싶다면 `df.describe()`를 사용하는 것도 좋은 방법이랍니다! 궁금한 점이 있나요?"
    },
    faq5: {
        q: "기존 데이터프레임에 새로운 열(Column)을 추가하거나 이름을 변경하는 방법을 알려주세요.",
        a: "데이터에 새로운 정보를 추가하거나 이름을 바꿀 수 있어요! 🏷️\n\n### 1. 새로운 열 추가하기\n새로운 열을 선언하고, 계산식을 넣어주면 됩니다.\n```python\n# '총점'이라는 새로운 열 만들기\ndf['총점'] = df['국어'] + df['영어'] + df['수학']\n```\n\n### 2. 열 이름 변경하기\n`rename` 함수를 사용합니다.\n```python\n# '국어' 열을 '국어점수'로 바꾸기\ndf.rename(columns={'국어': '국어점수'}, inplace=True)\n```\n\n어떤 열을 새로 만들고 싶으신가요?"
    },
    faq6: {
        q: "데이터프레임에 비어있는 값(결측치)이 있는지 확인하고, 이를 처리하는 방법을 알려주세요.",
        a: "실제 데이터에는 값이 비어있는 경우(NaN)가 많습니다. 이를 결측치라고 해요! 🧹\n\n### 1. 결측치 확인하기\n```python\ndf.isnull().sum()  # 각 열마다 비어있는 값의 개수 확인\n```\n\n### 2. 결측치 지우기 (dropna)\n```python\ndf.dropna()  # 비어있는 값이 하나라도 있는 행을 모두 삭제\n```\n\n### 3. 결측치 채우기 (fillna)\n```python\ndf.fillna(0)  # 비어있는 값을 0으로 채우기\n```\n\n여러분의 데이터에는 빈칸이 얼마나 있나요?"
    },
    faq7: {
        q: "특정 열(Column)을 기준으로 데이터를 오름차순이나 내림차순으로 정렬(sort_values)하는 방법을 알려주세요.",
        a: "데이터를 순위대로 줄 세우고 싶을 땐 `sort_values`를 사용합니다! 🏅\n\n### 기본 문법\n```python\n# 오름차순 정렬 (작은 수부터)\ndf.sort_values(by='성적')\n\n# 내림차순 정렬 (큰 수부터) - ascending=False 추가!\ndf.sort_values(by='성적', ascending=False)\n```\n\n어떤 데이터를 기준으로 1등부터 줄을 세워보고 싶나요?"
    },
    faq8: {
        q: "두 개의 데이터프레임을 하나로 합치는 merge와 concat의 사용법을 알려주세요.",
        a: "데이터가 여러 파일로 나뉘어 있을 때, 이를 하나로 합치는 것은 매우 중요합니다! 🧩\n\n### 1. 세로 또는 가로로 붙이기 (concat)\n- 블록을 위아래나 양옆으로 이어 붙이는 느낌이에요.\n```python\npd.concat([df1, df2])  # 위아래로 합치기\n```\n\n### 2. 공통된 열(Key)을 기준으로 합치기 (merge)\n- 엑셀의 VLOOKUP과 비슷한 역할이에요.\n```python\npd.merge(df1, df2, on='학번', how='inner')  # '학번'을 기준으로 병합\n```\n\n합치고 싶은 두 데이터에는 어떤 공통된 열이 있나요?"
    },
    faq9: {
        q: "데이터프레임의 전체 행/열 개수, 데이터 타입, 요약 통계 등을 한눈에 확인하는 방법을 알려주세요.",
        a: "데이터를 처음 불러왔을 때, 어떤 데이터인지 파악하는 기초 함수들입니다! 🔍\n\n### 기본 파악 함수\n- `df.head(5)` : 앞에서부터 5개 행만 살짝 엿보기\n- `df.info()` : 행과 열의 개수, 각 열의 데이터 타입, 결측치 여부 확인\n- `df.describe()` : 숫자형 데이터의 요약 통계(평균, 최소/최대 등) 한눈에 보기\n\n제일 먼저 `df.info()`를 실행해서 데이터를 파악해보는 것을 추천합니다!"
    },
    faq10: {
        q: "특정 열에서 원하는 문자열이 포함된 데이터만 찾아서 필터링하는 방법을 알려주세요.",
        a: "텍스트 데이터에서 특정 단어가 들어간 행만 쏙 골라낼 수 있어요! 🔎\n\n`str.contains()` 함수를 사용하면 됩니다.\n\n### 사용 예시\n```python\n# '이름' 열에 '김'이라는 글자가 포함된 행 찾기\ncondition = df['이름'].str.contains('김')\ndf[condition]\n```\n\n어떤 단어가 포함된 데이터를 찾고 싶으신가요?"
    },
    faq11: {
        q: "Plotly Express를 이용해서 산점도(Scatter Plot, 점 그래프)를 그리는 방법을 알려주세요.",
        a: "산점도는 두 데이터 간의 관계를 점으로 표현할 때 사용합니다! 🔵\n\n### 다양한 속성 활용\n```python\nimport plotly.express as px\n\nfig = px.scatter(\n    df, \n    x='수학', y='영어', \n    color='성별',          # 성별에 따라 점 색상 다르게\n    symbol='학급',        # 학급에 따라 점 모양 다르게 (동그라미, 세모 등)\n    size='총점',          # 총점이 높을수록 점 크기 크게\n    hover_data=['이름'],   # 마우스를 올렸을 때 '이름' 데이터도 표시\n    title='수학/영어 성적 산점도'\n)\nfig.show()\n```\n이렇게 여러 옵션을 조합하면 훨씬 풍성하고 예쁜 시각화가 가능해요!"
    },
    faq12: {
        q: "Plotly Express를 이용해서 선 그래프(Line Chart)를 그리는 방법을 알려주세요.",
        a: "시간의 흐름에 따른 변화(예: 연도별 기온 변화)를 볼 때는 선 그래프가 최고예요! 📈\n\n### 다양한 속성 활용\n```python\nimport plotly.express as px\n\nfig = px.line(\n    df, \n    x='연도', y='기온', \n    color='도시',          # 도시별로 선 색상 다르게 (여러 개의 선 생성)\n    markers=True,         # 선 중간중간에 데이터 포인트를 점(마커)으로 표시\n    line_dash='도시',      # 도시에 따라 선 종류 다르게 (점선, 실선 등)\n    title='도시별 연도별 기온 변화'\n)\nfig.show()\n```\n선에 마커(markers)를 추가하면 값이 있는 위치를 정확히 알 수 있어서 좋아요!"
    },
    faq13: {
        q: "Plotly Express를 이용해서 막대 그래프(Bar Chart)를 그리는 방법을 알려주세요.",
        a: "항목별 크기를 비교할 때(예: 과목별 평균 점수)는 막대 그래프를 주로 사용합니다! 📊\n\n### 다양한 속성 활용\n```python\nimport plotly.express as px\n\nfig = px.bar(\n    df, \n    x='과목', y='평균점수', \n    color='성별',          # 성별로 색상을 나눠서 누적 막대(Stacked bar) 생성\n    barmode='group',      # 누적하지 않고 옆으로 나란히 배치하고 싶을 때 사용!\n    text='평균점수',       # 막대 위에 점수 숫자 직접 표시\n    orientation='v',      # 가로 막대로 바꾸고 싶다면 'h'로 설정 (이때 x와 y 반대로!)\n    title='과목별 남녀 평균 점수 비교'\n)\nfig.update_traces(textposition='outside') # 글자를 막대 바깥에 표시\nfig.show()\n```\n누적 막대(`barmode='stack'`)와 그룹 막대(`barmode='group'`)를 비교해보세요!"
    },
    faq14: {
        q: "Plotly Express를 이용해서 데이터의 분포를 보는 히스토그램(Histogram) 그리는 방법을 알려주세요.",
        a: "데이터가 어떤 값에 얼마나 많이 몰려있는지(분포) 확인할 때는 히스토그램을 사용해요! 📉\n\n### 다양한 속성 활용\n```python\nimport plotly.express as px\n\nfig = px.histogram(\n    df, \n    x='점수', \n    nbins=20,             # 막대의 개수(구간의 세밀함) 지정\n    color='합격여부',       # 합격/불합격에 따라 색상 나누기\n    marginal='box',       # 그래프 위쪽에 박스 플롯(box plot) 추가 표시 (violin, rug 등 가능)\n    text_auto=True,       # 각 막대 위에 개수 숫자 자동 표시\n    title='전체 학생 성적 분포도'\n)\nfig.show()\n```\n`marginal` 속성을 쓰면 하나의 그래프 안에서 여러 통계 정보를 동시에 볼 수 있답니다!"
    },
    faq15: {
        q: "Plotly Express를 이용해서 파이 차트(Pie Chart, 원형 그래프)를 그리는 방법을 알려주세요.",
        a: "전체에서 각 항목이 차지하는 비율을 볼 때는 파이 차트가 훌륭하죠! 🍕\n\n### 다양한 속성 활용\n```python\nimport plotly.express as px\n\n# values에는 크기(숫자), names에는 항목(이름)을 넣습니다.\nfig = px.pie(\n    df, \n    values='인원수',       # 파이 크기를 결정할 숫자 데이터\n    names='반',           # 파이를 나눌 범주 데이터\n    hole=0.4,             # 가운데 구멍을 뚫어서 도넛(Donut) 차트로 만들기 (0~1 사이 값)\n    title='반별 인원수 비율'\n)\nfig.update_traces(textposition='inside', textinfo='percent+label') # 파이 안쪽에 비율과 라벨 표시\nfig.show()\n```\n가운데 구멍을 뚫은 도넛 차트가 디자인적으로 훨씬 깔끔해 보이는 경우가 많아요!"
    }
};

const faqItems = document.querySelectorAll('.faq-list li');

faqItems.forEach(item => {
    item.addEventListener('click', () => {
        const faqId = item.getAttribute('data-faq-id');
        if (faqId && faqData[faqId]) {
            // 사용자 질문 추가
            appendMessage(faqData[faqId].q, 'user');
            
            // 대화 기록에 사용자 질문 추가
            conversationHistory.push({
                role: "user",
                content: faqData[faqId].q
            });

            // 즉시 AI 답변 추가 (API 호출 없이)
            appendMessage(faqData[faqId].a, 'ai');
            
            // 대화 기록에 AI 답변 추가
            conversationHistory.push({
                role: "assistant",
                content: faqData[faqId].a
            });
            
            // 모바일 화면일 경우를 대비해 채팅창으로 스크롤 이동
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    });
});
