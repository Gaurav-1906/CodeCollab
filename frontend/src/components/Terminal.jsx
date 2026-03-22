import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

const Terminal = ({ user, roomId, language }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProcess, setCurrentProcess] = useState(null);
  const [inputBuffer, setInputBuffer] = useState('');

  useEffect(() => {
    // Initialize terminal
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    
    const terminal = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selection: '#264f78'
      },
      fontSize: 13,
      fontFamily: 'Consolas, "Courier New", monospace',
      rows: 20
    });
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    
    terminal.open(terminalRef.current);
    fitAddon.fit();
    
    xtermRef.current = terminal;
    
    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);
    
    // Display welcome message
    terminal.writeln('\x1b[1;32m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[1;32m║              CodeCollab Interactive Terminal              ║\x1b[0m');
    terminal.writeln('\x1b[1;32m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[1;33m📝 Select a file and click "Run" to start the program\x1b[0m');
    terminal.writeln('\x1b[1;33m💡 You can type input interactively after the program starts!\x1b[0m');
    terminal.writeln('');
    
    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, []);

  const runCode = async (code, language) => {
    if (isRunning) {
      xtermRef.current.writeln('\x1b[1;33m⚠️ A program is already running. Please wait...\x1b[0m');
      return;
    }
    
    setIsRunning(true);
    xtermRef.current.writeln('');
    xtermRef.current.writeln('\x1b[1;34m┌─────────────────────────────────────────────────────────┐\x1b[0m');
    xtermRef.current.writeln(`\x1b[1;34m│ Running ${language.toUpperCase()} program...\x1b[0m`);
    xtermRef.current.writeln('\x1b[1;34m└─────────────────────────────────────────────────────────┘\x1b[0m');
    xtermRef.current.writeln('');
    
    // Create a WebSocket connection for real-time execution
    const ws = new WebSocket('ws://localhost:5000');
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'execute',
        language: language,
        code: code
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'output') {
        xtermRef.current.write(data.content);
      } else if (data.type === 'input-request') {
        // Request user input
        xtermRef.current.write('\x1b[1;33m');
        // Wait for user input (handled by terminal's onData)
        const onData = (input) => {
          xtermRef.current.off('data', onData);
          xtermRef.current.write(input);
          ws.send(JSON.stringify({
            type: 'input',
            data: input
          }));
        };
        xtermRef.current.on('data', onData);
      } else if (data.type === 'complete') {
        xtermRef.current.writeln('');
        xtermRef.current.writeln('\x1b[1;32m─────────────────────────────────────────────────────────\x1b[0m');
        xtermRef.current.writeln('\x1b[1;32m✅ Program completed\x1b[0m');
        xtermRef.current.writeln('');
        setIsRunning(false);
        ws.close();
      } else if (data.type === 'error') {
        xtermRef.current.writeln('');
        xtermRef.current.writeln(`\x1b[1;31m❌ Error: ${data.message}\x1b[0m`);
        setIsRunning(false);
        ws.close();
      }
    };
    
    ws.onerror = () => {
      xtermRef.current.writeln('\x1b[1;31m❌ Connection error\x1b[0m');
      setIsRunning(false);
    };
    
    setCurrentProcess(ws);
  };

  const clearTerminal = () => {
    xtermRef.current.clear();
    xtermRef.current.writeln('\x1b[1;32m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    xtermRef.current.writeln('\x1b[1;32m║              CodeCollab Interactive Terminal              ║\x1b[0m');
    xtermRef.current.writeln('\x1b[1;32m╚══════════════════════════════════════════════════════════╝\x1b[0m');
    xtermRef.current.writeln('');
    xtermRef.current.writeln('\x1b[1;33m📝 Select a file and click "Run" to start the program\x1b[0m');
    xtermRef.current.writeln('');
  };

  const stopProgram = () => {
    if (currentProcess) {
      currentProcess.close();
      xtermRef.current.writeln('\x1b[1;33m⏹️ Program stopped by user\x1b[0m');
      setIsRunning(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      background: '#1e1e1e'
    }}>
      {/* Terminal Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: '#252526',
        borderBottom: '1px solid #3e3e42'
      }}>
        <span style={{ color: '#fff', fontSize: '12px' }}>💻 Terminal</span>
        <button
          onClick={clearTerminal}
          style={{
            padding: '2px 8px',
            background: '#3a3a3a',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Clear
        </button>
        {isRunning && (
          <button
            onClick={stopProgram}
            style={{
              padding: '2px 8px',
              background: '#f44336',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Stop
          </button>
        )}
      </div>
      
      {/* Terminal */}
      <div 
        ref={terminalRef} 
        style={{ 
          flex: 1, 
          overflow: 'hidden',
          background: '#1e1e1e'
        }} 
      />
    </div>
  );
};

export default Terminal;