(function(){
  var N=20, cv=document.getElementById("c"), ctx=cv.getContext("2d"), S=cv.width/N;
  var $=function(id){return document.getElementById(id)};
  var snake, dir, next, food, foodFriend=null, score, best=0, loop=null, running=false, bonus=null, bonusT=0, level="normal", paused=false, soundOn=true, ac=null, rocks=[], rocksOn=false, wrap=false, skin=null, top=[];
  var particles=[], foodColor="#ff4d9d", rainbowShift=0, foodPop=null;
  var quizActive=false, quizSeconds=15, quizTimer=null;
  var QUIZZES=[
    {q:"12 + 8 = ?",a:"20",choices:["18","20","21","22"]},
    {q:"9 × 3 = ?",a:"27",choices:["21","24","27","30"]},
    {q:"45 ÷ 5 = ?",a:"9",choices:["5","8","9","10"]},
    {q:"16 − 7 = ?",a:"9",choices:["7","8","9","11"]},
    {q:"6 × 6 = ?",a:"36",choices:["30","32","36","42"]},
    {q:"25 + 17 = ?",a:"42",choices:["40","41","42","43"]}
  ];
  var FOOD_COLORS=["#ff4d9d","#ff5a36","#ffd166","#40d9a0","#55aaff","#a66cff"];
  var FRIENDS=["images/friend1.jpg","images/friend2.jpg","images/friend3.jpg","images/friend4.jpg"];
  var friendImages={};
  FRIENDS.forEach(function(src){
    var img=new Image();
    img.onload=function(){friendImages[src]=img};
    img.onerror=function(){friendImages[src]=null};
    img.src=src;
  });
  try{best=parseInt(localStorage.getItem("snake-best")||"0",10)||0}catch(e){}
  $("best").textContent=best;
  var V={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  var SKINS=[null,{b:"#3b82f6",h:"#1d4ed8"},{b:"#a855f7",h:"#7e22ce"},{b:"#f59e0b",h:"#b45309"}];
  try{top=JSON.parse(localStorage.getItem("snake-top")||"[]")}catch(e){top=[]}
  if(!Array.isArray(top))top=[];
  top=top.filter(function(n){return typeof n==="number"&&isFinite(n)}).slice(0,5);
  function renderTop(){
    var el=$("top"); el.innerHTML="";
    top.forEach(function(s,i){var li=document.createElement("li");li.innerHTML=(i+1)+". <b>"+s+"</b>";el.appendChild(li)});
  }
  renderTop();

  function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
  function placeFood(){
    var free=[];
    for(var x=0;x<N;x++)for(var y=0;y<N;y++){
      if(!snake.some(function(s){return s[0]===x&&s[1]===y})&&!isRock(x,y))free.push([x,y]);
    }
    food=free.length?free[Math.floor(Math.random()*free.length)]:null;
    if(food){
      foodColor=FOOD_COLORS[Math.floor(Math.random()*FOOD_COLORS.length)];
      foodFriend=FRIENDS[Math.floor(Math.random()*FRIENDS.length)];
    }else{
      foodFriend=null;
    }
  }
  function reset(){
    snake=[[10,10],[9,10],[8,10]]; dir=V.right; next=V.right; score=0; bonus=null; paused=false;
    particles=[]; rainbowShift=0; foodPop=null;
    quizActive=false; if(quizTimer)clearInterval(quizTimer); if($("quizPanel"))$("quizPanel").hidden=true;
    $("score").textContent=0; $("level").textContent=1; rocks=[]; placeFood(); if(rocksOn){for(var i=0;i<4;i++)addRock(true)} draw();
  }
  function draw(){
    ctx.fillStyle=css("--board"); ctx.fillRect(0,0,cv.width,cv.height);
    ctx.fillStyle=css("--grid");
    for(var x=0;x<N;x++)for(var y=0;y<N;y++){ if((x+y)%2===0)ctx.fillRect(x*S,y*S,S,S); }
    if(food){
      var cx=food[0]*S+S/2, cy=food[1]*S+S/2, photoSize=S*2;
      var img=friendImages[foodFriend];
      ctx.save();
      ctx.shadowBlur=S*.9; ctx.shadowColor=foodColor;
      ctx.fillStyle=foodColor;
      ctx.beginPath(); ctx.arc(cx,cy,photoSize/2+S*.12,0,Math.PI*2); ctx.fill();
      ctx.restore();
      if(img){
        ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,photoSize/2,0,Math.PI*2); ctx.clip();
        var iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
        var scale=Math.max(photoSize/iw,photoSize/ih);
        var dw=iw*scale, dh=ih*scale;
        ctx.drawImage(img,cx-dw/2,cy-dh/2,dw,dh); ctx.restore();
      }else{
        ctx.save(); ctx.shadowBlur=S*.7; ctx.shadowColor=foodColor;
        ctx.fillStyle=foodColor; ctx.beginPath(); ctx.arc(cx,cy,S*.36,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.fillStyle="rgba(255,255,255,.75)";ctx.beginPath();ctx.arc(cx-S*.05,cy-S*.08,S*.09,0,Math.PI*2);ctx.fill();
      }
    }
    if(foodPop){
      var popRadius=S*(.5+(12-foodPop.life)/12*1.1);
      ctx.save(); ctx.globalAlpha=Math.max(0,foodPop.life/12); ctx.strokeStyle=foodColor; ctx.lineWidth=4;
      ctx.shadowBlur=12; ctx.shadowColor=foodColor; ctx.beginPath();
      ctx.arc(foodPop.x*S+S/2,foodPop.y*S+S/2,popRadius,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }
    rocks.forEach(function(r){ctx.fillStyle="#7b8290";ctx.beginPath();if(ctx.roundRect)ctx.roundRect(r[0]*S+1,r[1]*S+1,S-2,S-2,6);else ctx.rect(r[0]*S+1,r[1]*S+1,S-2,S-2);ctx.fill();ctx.fillStyle="#9aa1ad";ctx.fillRect(r[0]*S+5,r[1]*S+5,S/3,3)});
    if(bonus){ctx.fillStyle="#f2b200";ctx.beginPath();ctx.arc(bonus[0]*S+S/2,bonus[1]*S+S/2,S*0.42,0,Math.PI*2);ctx.fill();ctx.fillStyle=css("--board");ctx.beginPath();ctx.arc(bonus[0]*S+S/2,bonus[1]*S+S/2,S*0.16,0,Math.PI*2);ctx.fill();}
    snake.forEach(function(s,i){
      var hue=(i*28+rainbowShift)%360;
      ctx.fillStyle=skin?(i===0?skin.h:skin.b):"hsl("+hue+",88%,58%)";
      if(i===0)ctx.shadowBlur=skin?0:8,ctx.shadowColor="hsl("+hue+",88%,58%)";
      var p=1.5; ctx.beginPath();
      if(ctx.roundRect)ctx.roundRect(s[0]*S+p,s[1]*S+p,S-2*p,S-2*p,5); else ctx.rect(s[0]*S+p,s[1]*S+p,S-2*p,S-2*p);
      ctx.fill(); ctx.shadowBlur=0;
    });
    particles.forEach(function(p){
      ctx.globalAlpha=Math.max(0,p.life/30);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
    });ctx.globalAlpha=1;
  }
  function tick(){
    dir=next;
    var h=[snake[0][0]+dir[0],snake[0][1]+dir[1]];
    if(wrap){h[0]=(h[0]+N)%N;h[1]=(h[1]+N)%N}
    var hitWall=h[0]<0||h[1]<0||h[0]>=N||h[1]>=N||isRock(h[0],h[1]);
    var ate=food&&h[0]===food[0]&&h[1]===food[1];
    var ateB=bonus&&h[0]===bonus[0]&&h[1]===bonus[1];
    var body=(ate||ateB)?snake:snake.slice(0,-1);
    var hitSelf=body.some(function(s){return s[0]===h[0]&&s[1]===h[1]});
    if(hitWall||hitSelf){return over()}
    snake.unshift(h);
    if(ate){
      openQuiz();
      return;
    }else if(ateB){
      score+=5; $("score").textContent=score; updateLevel(); burst(bonus[0],bonus[1]); rainbowShift=(rainbowShift+28)%360; playGameSound("bonus",990,.15); bonus=null; restart();
    }else{snake.pop()}
    if(bonus&&--bonusT<=0)bonus=null;
    rainbowShift=(rainbowShift+1)%360;
    updateParticles();
    draw();
  }
  function speed(){var base={easy:190,normal:150,hard:110}[level];return Math.max(50,base-score*4)}
  function isRock(x,y){return rocks.some(function(r){return r[0]===x&&r[1]===y})}
  function addRock(initial){
    var free=[],hx=snake[0][0],hy=snake[0][1];
    for(var x=0;x<N;x++)for(var y=0;y<N;y++){
      if(snake.some(function(s){return s[0]===x&&s[1]===y})||isRock(x,y))continue;
      if(food&&food[0]===x&&food[1]===y)continue;
      if(bonus&&bonus[0]===x&&bonus[1]===y)continue;
      if(initial?(y>=8&&y<=12):(Math.abs(x-hx)+Math.abs(y-hy)<5))continue;
      free.push([x,y]);
    }
    if(free.length)rocks.push(free[Math.floor(Math.random()*free.length)]);
  }
  var GAME_SOUNDS={
    eat:new Audio("Thalapathy Thalapathy.mp3"),
    bonus:new Audio("Omae wa mou shindeiru.mp3"),
    over:new Audio("Omae wa mou shindeiru.mp3")
  };
  var SOUND_LENGTH={eat:700,bonus:1200,over:1500}, soundStopTimers={};
  Object.keys(GAME_SOUNDS).forEach(function(name){
    var audio=GAME_SOUNDS[name];
    audio.volume=0.7;
    audio.preload="auto";
    audio.load();
  });
  function playGameSound(name,beepFrequency,beepDuration){
    if(!soundOn)return;
    var audio=GAME_SOUNDS[name];
    if(audio){
      try{
        audio.pause();
        audio.currentTime=0;
        var playPromise=audio.play();
        if(soundStopTimers[name])clearTimeout(soundStopTimers[name]);
        soundStopTimers[name]=setTimeout(function(){
          audio.pause(); audio.currentTime=0;
        },SOUND_LENGTH[name]||700);
        if(playPromise&&playPromise.catch){
          playPromise.catch(function(){beep(beepFrequency,beepDuration)});
        }
        return;
      }catch(e){}
    }
    beep(beepFrequency,beepDuration);
  }
  function placeBonus(){
    var free=[];
    for(var x=0;x<N;x++)for(var y=0;y<N;y++){
      if(!snake.some(function(s){return s[0]===x&&s[1]===y})&&!(food&&food[0]===x&&food[1]===y)&&!isRock(x,y))free.push([x,y]);
    }
    if(free.length){bonus=free[Math.floor(Math.random()*free.length)];bonusT=40}
  }
  function togglePause(){
    if(!running||quizActive)return;
    paused=!paused;
    if(paused){clearInterval(loop);$("pause").textContent="Resume"}
    else{restart();$("pause").textContent="Pause"}
  }
  function restart(){clearInterval(loop);loop=setInterval(tick,speed())}
  function openQuiz(){
    clearInterval(loop); quizActive=true; quizSeconds=15;
    var question=QUIZZES[Math.floor(Math.random()*QUIZZES.length)];
    $("quizQuestion").textContent=question.q;
    $("quizTimer").textContent=quizSeconds;
    var answers=$("quizAnswers"); answers.innerHTML="";
    question.choices.forEach(function(answer){
      var button=document.createElement("button"); button.textContent=answer;
      button.addEventListener("click",function(){finishQuiz(answer===question.a)}); answers.appendChild(button);
    });
    $("quizPanel").hidden=false; draw();
    quizTimer=setInterval(function(){
      quizSeconds--; $("quizTimer").textContent=quizSeconds;
      if(quizSeconds<=0){finishQuiz(false,true)}
    },1000);
  }
  function finishQuiz(correct,timeout){
    if(!quizActive)return;
    clearInterval(quizTimer); quizActive=false; $("quizPanel").hidden=true;
    if(!correct){
      $("ovTitle").textContent=timeout?"Time ran out":"Wrong answer";
      $("ovText").textContent="The quiz stopped the snake. Try again!";
      $("go").textContent="Play again";
      over(false,timeout?"Time ran out":"Wrong answer","The quiz stopped the snake. Try again!");
      return;
    }
    score++; $("score").textContent=score; updateLevel();
    foodPop={x:food[0],y:food[1],life:12}; burst(food[0],food[1]); rainbowShift=(rainbowShift+28)%360;
    playGameSound("eat",660,.08); placeFood();
    if(!food)return over(true);
    if(rocksOn&&score%5===0&&rocks.length<12)addRock(false);
    if(!bonus&&Math.random()<0.25)placeBonus();
    restart(); draw();
  }
  function beep(f,d){
    if(!soundOn||!ac)return;
    try{var o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;g.gain.value=0.08;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch(e){}
  }
  function start(){
    try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume()}catch(e){}
    Object.keys(GAME_SOUNDS).forEach(function(name){var audio=GAME_SOUNDS[name];try{audio.pause();audio.currentTime=0;var promise=audio.play();if(promise&&promise.then){promise.then(function(){audio.pause();audio.currentTime=0}).catch(function(){})}}catch(e){}});
    reset();running=true;$("pause").textContent="Pause";$("ov").classList.add("hide");openQuiz();
  }
  function over(won,customTitle,customText){
    clearInterval(loop);running=false;paused=false;playGameSound("over",180,.3);
    if(score>best){best=score;$("best").textContent=best;try{localStorage.setItem("snake-best",String(best))}catch(e){}}
    if(score>0){top.push(score);top.sort(function(a,b){return b-a});top=top.slice(0,5);try{localStorage.setItem("snake-top",JSON.stringify(top))}catch(e){}renderTop()}
    $("ovTitle").textContent=customTitle||(won?"You filled the board":"Game over");$("ovText").textContent=customText||("You scored "+score+". Best score: "+best+".");$("go").textContent="Play again";$("ov").classList.remove("hide");draw();
  }
  function turn(name){var v=V[name];if(!v||!running||quizActive)return;if(v[0]===-dir[0]&&v[1]===-dir[1])return;next=v}
  document.addEventListener("keydown",function(e){var m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"}[e.key];if(m){e.preventDefault();turn(m)}else if(e.key=== "p"||e.key=== "P"||(e.key=== " "&&running)){e.preventDefault();togglePause()}else if((e.key=== " "||e.key=== "Enter")&&!running&&document.activeElement.tagName!== "BUTTON")start()});
  Array.prototype.forEach.call(document.querySelectorAll(".dpad button"),function(b){b.addEventListener("click",function(){turn(b.getAttribute("data-d"))})});
  var sx=0,sy=0;
  cv.addEventListener("touchstart",function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
  cv.addEventListener("touchend",function(e){var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;turn(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"))},{passive:true});
  $("rockBtn").addEventListener("click",function(){rocksOn=!rocksOn;this.setAttribute("aria-pressed",String(rocksOn));this.textContent=rocksOn?"Rocks: on":"Rocks: off"});
  $("wrapBtn").addEventListener("click",function(){wrap=!wrap;this.setAttribute("aria-pressed",String(wrap));this.textContent=wrap?"Walls: wrap":"Walls: solid"});
  var sws=document.querySelectorAll("#skins button");Array.prototype.forEach.call(sws,function(b){b.addEventListener("click",function(){skin=SKINS[+b.getAttribute("data-k")];Array.prototype.forEach.call(sws,function(x){x.setAttribute("aria-pressed",String(x===b))});draw()})});
  $("pause").addEventListener("click",togglePause);
  $("snd").addEventListener("click",function(){soundOn=!soundOn;this.setAttribute("aria-pressed",String(soundOn));this.textContent=soundOn?"Sound on":"Sound off"});
  var dbs=document.querySelectorAll("#diff button");Array.prototype.forEach.call(dbs,function(b){b.addEventListener("click",function(){level=b.getAttribute("data-s");Array.prototype.forEach.call(dbs,function(x){x.setAttribute("aria-pressed",String(x===b))})})});
  $("go").addEventListener("click",start);
  reset();
  var savedSession="";
  try{savedSession=sessionStorage.getItem("snake-session")||""}catch(e){}
  if(savedSession){showGame(savedSession)}else{showLogin()}
  
  var authMode="login";
  function encodePassword(password){try{return btoa(unescape(encodeURIComponent(password)))}catch(e){return password}}
  function getAccounts(){try{return JSON.parse(localStorage.getItem("snake-accounts")||"{}")||{}}catch(e){return{}}}
  function showGame(username){$("loginScreen").classList.add("hidden");$("gameApp").classList.remove("hidden");if(username)$("ovText").textContent="Welcome, "+username+"! Eat the glowing friend photos to grow."}
  function showLogin(){running=false;if(loop)clearInterval(loop);quizActive=false;$("loginScreen").classList.remove("hidden");$("gameApp").classList.remove("hidden");$("loginError").textContent=""}
  $("authSwitch").addEventListener("click",function(){authMode=authMode=== "login"?"create":"login";$("loginButton").textContent=authMode=== "login"?"Log in":"Create account";$("password").autocomplete=authMode=== "login"?"current-password":"new-password";this.textContent=authMode=== "login"?"New player? Create an account":"Already have an account? Log in";$("loginError").textContent=""});
  $("loginForm").addEventListener("submit",function(e){e.preventDefault();var username=$("username").value.trim(),password=$("password").value;if(username.length<2||password.length<4){$("loginError").textContent="Use a username with 2+ characters and a password with 4+ characters.";return}var accounts=getAccounts(),key=username.toLowerCase();if(authMode=== "create"){if(accounts[key]){$("loginError").textContent="That username already exists. Please log in.";return}accounts[key]={password:encodePassword(password)};try{localStorage.setItem("snake-accounts",JSON.stringify(accounts))}catch(e){}}else if(!accounts[key]||accounts[key].password!==encodePassword(password)){$("loginError").textContent="Username or password is incorrect.";return}try{sessionStorage.setItem("snake-session",username)}catch(e){}$("password").value="";showGame(username)});
  $("logout").addEventListener("click",function(){try{sessionStorage.removeItem("snake-session")}catch(e){}showLogin()});
  reset();
  var savedSession="";
  try{savedSession=sessionStorage.getItem("snake-session")||""}catch(e){}
  if(savedSession){showGame(savedSession)}else{showLogin()}
})();
