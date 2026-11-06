const { useEffect, useRef, useState } = React;

const isLocal = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
const API_URL = isLocal ? 'http://127.0.0.1:3001/api/chat' : '/api/chat';

const AVATAR = 'assets/bot-avatar.svg';
const BOT_NAME = 'AI 비서';
const MAX_LENGTH = 2000;
const MAX_INPUT_HEIGHT = 140;
const CONNECTION_ERROR = '서버에 연결하지 못했습니다. 서버가 켜져 있는지 확인해 주세요.';
const GENERAL_ERROR = '답변을 받지 못했습니다. 잠시 후 다시 시도해 주세요.';
const SUGGESTIONS = [
  '품질경영이 뭐야?',
  '불량 원인 분석 방법 알려줘',
  '8D 보고서 작성 순서 알려줘',
];

const DEFAULT_SIZE = { width: 440, height: 680 };
const MIN_WIDTH = 340;
const MIN_HEIGHT = 420;
const RESIZE_STEP = 20;
const SIZE_KEY = 'chat-size';

// 팝업이 화면 밖으로 나가지 않는 범위 (좌우 여백 48px, 아이콘 자리 포함 위아래 124px)
function clampSize({ width, height }) {
  return {
    width: Math.min(Math.max(width, MIN_WIDTH), window.innerWidth - 48),
    height: Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight - 124),
  };
}

function loadSize() {
  try {
    const saved = JSON.parse(localStorage.getItem(SIZE_KEY));
    if (saved?.width >= MIN_WIDTH && saved?.height >= MIN_HEIGHT) return saved;
  } catch {}
  return DEFAULT_SIZE;
}

function saveSize(size) {
  try {
    localStorage.setItem(SIZE_KEY, JSON.stringify(size));
  } catch {}
}

function formatTime() {
  return new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

function formatDate() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

async function requestReply(messages) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch {
    throw new Error(CONNECTION_ERROR);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.reply) {
    throw new Error(data.error || GENERAL_ERROR);
  }
  return data.reply;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.5L15 12 3.39 13.9z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.6 1.6 4.9 4 6.4V21.5l4.1-2.7c.6.1 1.2.2 1.9.2 5.5 0 10-3.6 10-8s-4.5-8-10-8z" />
    </svg>
  );
}

function ResizeIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M1 8 8 1M1 12 12 1" />
    </svg>
  );
}

function CloseIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function BotMessage({ className = '', role, time, children }) {
  return (
    <div className={`message assistant ${className}`} role={role}>
      <img className="avatar" src={AVATAR} alt="" />
      <div className="message-body">
        <span className="sender">{BOT_NAME}</span>
        <div className="bubble-row">
          <div className="bubble">{children}</div>
          {time && <time>{time}</time>}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ time, children }) {
  return (
    <div className="message user">
      <div className="message-body">
        <div className="bubble-row">
          <div className="bubble">{children}</div>
          <time>{time}</time>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(loadSize);
  const chatRef = useRef(null);
  const dragRef = useRef(null);
  const nextId = useRef(1);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const launcherRef = useRef(null);
  const hasOpened = useRef(false);

  useEffect(() => {
    if (open) {
      hasOpened.current = true;
      // 휴대폰에서는 팝업을 열자마자 키보드가 올라오지 않게 한다.
      if (window.matchMedia('(hover: hover)').matches) inputRef.current.focus();
      const closeOnEscape = (event) => {
        if (event.key === 'Escape') setOpen(false);
      };
      document.addEventListener('keydown', closeOnEscape);
      return () => document.removeEventListener('keydown', closeOnEscape);
    }
    if (hasOpened.current) launcherRef.current.focus();
  }, [open]);

  useEffect(() => {
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const element = inputRef.current;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [input]);

  useEffect(() => {
    saveSize(size);
  }, [size]);

  // 팝업이 오른쪽 아래에 붙어 있으므로 왼쪽·위쪽으로 끌면 커진다.
  function resizeHandlers(axis) {
    return {
      onPointerDown(event) {
        event.currentTarget.setPointerCapture(event.pointerId);
        const { width, height } = chatRef.current.getBoundingClientRect();
        dragRef.current = { axis, x: event.clientX, y: event.clientY, width, height };
      },
      onPointerMove(event) {
        const drag = dragRef.current;
        if (!drag) return;
        setSize(clampSize({
          width: drag.axis === 'y' ? drag.width : drag.width + drag.x - event.clientX,
          height: drag.axis === 'x' ? drag.height : drag.height + drag.y - event.clientY,
        }));
      },
      onPointerUp() {
        dragRef.current = null;
      },
      onPointerCancel() {
        dragRef.current = null;
      },
    };
  }

  function handleResizeKey(event) {
    const change = {
      ArrowLeft: [RESIZE_STEP, 0],
      ArrowRight: [-RESIZE_STEP, 0],
      ArrowUp: [0, RESIZE_STEP],
      ArrowDown: [0, -RESIZE_STEP],
    }[event.key];
    if (!change) return;
    event.preventDefault();
    const { width, height } = chatRef.current.getBoundingClientRect();
    setSize(clampSize({ width: width + change[0], height: height + change[1] }));
  }

  function addMessage(message) {
    setMessages((current) => [
      ...current,
      { id: nextId.current++, time: formatTime(), ...message },
    ]);
  }

  async function send(rawText) {
    const text = rawText.trim();
    if (!text || loading) return;

    // 오류 안내는 화면에만 보여 주고 Gemini에는 보내지 않는다.
    const history = messages
      .filter((message) => !message.isError)
      .map(({ role, text }) => ({ role, text }));

    addMessage({ role: 'user', text });
    setInput('');
    setLoading(true);
    try {
      const reply = await requestReply([...history, { role: 'user', text }]);
      addMessage({ role: 'assistant', text: reply });
    } catch (error) {
      addMessage({ role: 'assistant', text: error.message, isError: true });
    } finally {
      setLoading(false);
      inputRef.current.focus();
    }
  }

  function handleKeyDown(event) {
    // 한글 조합 중의 Enter는 글자 확정용이므로 전송하지 않는다.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    send(input);
  }

  const isEmpty = messages.length === 0 && !loading;

  return (
    <>
    <CapstoneDashboard />

    <section
      className={`chat${open ? ' open' : ''}`}
      role="dialog"
      aria-label="품질경영실 AI 비서"
      aria-hidden={!open}
      ref={chatRef}
      style={{ '--chat-width': `${size.width}px`, '--chat-height': `${size.height}px` }}
    >
      <div className="resize-edge left" {...resizeHandlers('x')} />
      <div className="resize-edge top" {...resizeHandlers('y')} />
      <button
        type="button"
        className="resize-corner"
        aria-label="채팅창 크기 조절. 방향키로 조절하고, 두 번 누르면 원래 크기로 돌아갑니다."
        title="끌어서 크기 조절 (두 번 누르면 원래 크기)"
        onKeyDown={handleResizeKey}
        onDoubleClick={() => setSize(DEFAULT_SIZE)}
        {...resizeHandlers('both')}
      >
        <ResizeIcon />
      </button>

      <header className="chat-header">
        <img className="header-avatar" src={AVATAR} alt="" />
        <div className="header-text">
          <h1>품질경영실 AI 비서</h1>
          <p>신진엠텍 품질경영실</p>
        </div>
        <button
          type="button"
          className="clear-button"
          onClick={() => setMessages([])}
          aria-label="대화 지우기"
          disabled={loading || messages.length === 0}
        >
          <TrashIcon />
          <span className="clear-label">대화 지우기</span>
        </button>
        <button
          type="button"
          className="close-button"
          aria-label="채팅 닫기"
          title="닫기"
          onClick={() => setOpen(false)}
        >
          <CloseIcon />
        </button>
      </header>

      <div className="message-list" ref={listRef}>
        {isEmpty ? (
          <section className="welcome">
            <img src={AVATAR} alt="" />
            <h2>안녕하세요!</h2>
            <p>품질 업무에 대해 무엇이든 물어보세요.</p>
            <div className="suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="date-divider"><span>{formatDate()}</span></div>
        )}

        {messages.map((message) =>
          message.role === 'user' ? (
            <UserMessage key={message.id} time={message.time}>{message.text}</UserMessage>
          ) : (
            <BotMessage
              key={message.id}
              className={message.isError ? 'error' : ''}
              role={message.isError ? 'alert' : undefined}
              time={message.time}
            >
              {message.text}
            </BotMessage>
          )
        )}

        {loading && (
          <BotMessage className="status" role="status">
            <span className="dots" aria-hidden="true"><i /><i /><i /></span>
            답변 작성 중...
          </BotMessage>
        )}
      </div>

      <footer className="composer">
        <form className="composer-box" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            rows="1"
            value={input}
            maxLength={MAX_LENGTH}
            placeholder="메시지를 입력하세요"
            aria-label="질문 입력"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="submit"
            className="send-button"
            aria-label="보내기"
            title="보내기"
            disabled={loading || !input.trim()}
          >
            <SendIcon />
          </button>
        </form>
        <p className="notice">실습용 챗봇입니다. 실제 회사 자료나 개인정보를 입력하지 마세요.</p>
      </footer>
    </section>

    <button
      ref={launcherRef}
      type="button"
      className={`launcher${open ? ' open' : ''}`}
      aria-label={open ? '채팅 닫기' : '채팅 열기'}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      {open ? <CloseIcon size={26} /> : <ChatIcon />}
    </button>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
