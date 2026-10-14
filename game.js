(() => {
  const SIZE = 4;
  const boardEl = document.querySelector('#board');
  const scoreEl = document.querySelector('#score');
  const bestEl = document.querySelector('#best');
  const statusEl = document.querySelector('#game-status');
  const undoButton = document.querySelector('#undo');
  const overlay = document.querySelector('#end-overlay');
  const scoreAdd = document.querySelector('#score-add');
  let board, score, best, previous, won, keepGoing, locked;
  let pointerStart = null;

  try { best = Number(localStorage.getItem('2048-best')) || 0; } catch { best = 0; }
  bestEl.textContent = best;

  function emptyBoard() { return Array.from({length: SIZE}, () => Array(SIZE).fill(0)); }
  function newGame() {
    board = emptyBoard(); score = 0; previous = null; won = false; keepGoing = false; locked = false;
    board[Math.floor(Math.random()*SIZE)][Math.floor(Math.random()*SIZE)] = 2;
    addTile(); scoreEl.textContent = '0'; overlay.hidden = true; undoButton.disabled = true;
    statusEl.textContent = '開始一局吧'; render();
  }
  function addTile() {
    const empty = [];
    board.forEach((row,r) => row.forEach((v,c) => { if (!v) empty.push([r,c]); }));
    if (!empty.length) return;
    const [r,c] = empty[Math.floor(Math.random()*empty.length)];
    board[r][c] = Math.random() < .9 ? 2 : 4;
  }
  function render() {
    boardEl.replaceChildren();
    board.forEach((row,r) => row.forEach((value,c) => {
      const tile = document.createElement('div');
      tile.className = 'tile' + (value ? (value <= 2048 ? ` v-${value}` : ' high') : '');
      tile.setAttribute('role','gridcell');
      tile.setAttribute('aria-label',value ? `${value}` : '空');
      tile.textContent = value || '';
      boardEl.append(tile);
    }));
  }
  function compress(line) {
    const values = line.filter(Boolean), result = [], gained = 0;
    let points = gained;
    for(let i=0;i<values.length;i++) {
      if(values[i] === values[i+1]) { const merged = values[i]*2; result.push(merged); points += merged; i++; }
      else result.push(values[i]);
    }
    while(result.length < SIZE) result.push(0);
    return {line:result,points};
  }
  function linesFor(direction) {
    const lines=[];
    for(let i=0;i<SIZE;i++) {
      const coords=[];
      for(let j=0;j<SIZE;j++) {
        if(direction==='left') coords.push([i,j]);
        else if(direction==='right') coords.push([i,SIZE-1-j]);
        else if(direction==='up') coords.push([j,i]);
        else coords.push([SIZE-1-j,i]);
      }
      lines.push(coords);
    }
    return lines;
  }
  function move(direction) {
    if(locked || !overlay.hidden) return;
    const old = board.map(row=>row.slice());
    const next = board.map(row=>row.slice()); let gained=0;
    for(const coords of linesFor(direction)) {
      const packed=compress(coords.map(([r,c])=>board[r][c])); gained+=packed.points;
      coords.forEach(([r,c],i)=>{ next[r][c]=packed.line[i]; });
    }
    if(next.every((row,r)=>row.every((v,c)=>v===board[r][c]))) return;
    previous={board:old,score}; board=next; score+=gained; addTile();
    if(score>best) { best=score; bestEl.textContent=best; try { localStorage.setItem('2048-best',String(best)); } catch {} }
    scoreEl.textContent=score; undoButton.disabled=false;
    if(gained) showScoreAdd(gained);
    render();
    if(!won && board.some(row=>row.includes(2048))) { won=true; endGame(true); return; }
    if(!canMove()) endGame(false);
  }
  function showScoreAdd(points) {
    scoreAdd.textContent=`+${points}`; scoreAdd.classList.remove('show'); void scoreAdd.offsetWidth; scoreAdd.classList.add('show');
    setTimeout(()=>scoreAdd.classList.remove('show'),650);
  }
  function canMove() {
    for(let r=0;r<SIZE;r++) for(let c=0;c<SIZE;c++) {
      if(!board[r][c]) return true;
      if(c<SIZE-1 && board[r][c]===board[r][c+1]) return true;
      if(r<SIZE-1 && board[r][c]===board[r+1][c]) return true;
    }
    return false;
  }
  function endGame(isWin) {
    locked=true; overlay.hidden=false;
    document.querySelector('#end-star').textContent=isWin?'✳':'↻';
    document.querySelector('#end-title').textContent=isWin?'合成 2048！':'棋盘满了';
    document.querySelector('#end-copy').textContent=isWin?`太厉害了！当前得分 ${score}。`:`当前得分 ${score}，再来一局试试吧。`;
    document.querySelector('#keep-playing').hidden=!isWin;
    statusEl.textContent=isWin?'达成目标！':'游戏结束';
  }
  function undo() {
    if(!previous) return;
    board=previous.board; score=previous.score; previous=null; locked=false; overlay.hidden=true;
    scoreEl.textContent=score; undoButton.disabled=true; statusEl.textContent='继续挑战'; render();
  }
  function handleDirection(direction) { move(direction); }
  document.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    const map={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'up',w:'up',arrowdown:'down',s:'down'};
    if(map[key]) { event.preventDefault(); handleDirection(map[key]); }
    else if(key==='z' || key==='u') { event.preventDefault(); undo(); }
    else if(key==='r') { event.preventDefault(); newGame(); }
  });
  const wrapper=document.querySelector('#board-wrap');
  wrapper.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};});
  wrapper.addEventListener('pointerup',event=>{
    if(!pointerStart) return;
    const dx=event.clientX-pointerStart.x, dy=event.clientY-pointerStart.y; pointerStart=null;
    if(Math.max(Math.abs(dx),Math.abs(dy))<25) return;
    handleDirection(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
  });
  wrapper.addEventListener('pointercancel',()=>{pointerStart=null;});
  document.querySelector('#new-game').addEventListener('click',()=>{if(confirm('要开始新的一局吗？')) newGame();});
  undoButton.addEventListener('click',undo);
  document.querySelector('#keep-playing').addEventListener('click',()=>{overlay.hidden=true;locked=false;keepGoing=true;statusEl.textContent='继续挑战';});
  document.querySelector('#play-again').addEventListener('click',newGame);
  newGame();
})();
