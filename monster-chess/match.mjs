import {newGame,moves,captureTarget,collectSupport,applyMove,recordWounds,exhaust,continuationIssue,classicStatus,other,TYPES} from './engine.mjs';
import {makeArena,stepArena} from './arena.mjs';
export class Match{
 constructor(game=newGame(),duration=null){this.game=game;this.duration=duration===60?60:null;this.phase='board';this.pending=null;this.support=null;this.selection={};this.world=null;this.result=null;this.practice=false;this.offerStage=null;this.checkEnd();}
 play(m){if(this.phase!=='board')return false;const legal=moves(this.game,m.from).find(x=>x.to===m.to&&(x.promote??null)===(m.promote??null));if(this.game.board[m.from]?.s!==this.game.turn||!legal)return false;
  if(this.game.mode==='duel'&&captureTarget(this.game,legal)){this.pending=legal;this.support=collectSupport(this.game,legal);this.selection={};this.phase='pick';}
  else{this.game=applyMove(this.game,legal);this.checkEnd();}return true;
 }
 practiceStart(){if(this.phase!=='board'&&this.phase!=='gameover')return false;this.returnPhase=this.phase;this.practice=true;this.pending=null;this.support={w:[],b:[],pieces:[]};this.selection={};this.phase='pick';this.result=null;return true;}
 choose(s,t){if(this.phase!=='pick'||this.selection[s]||!TYPES.includes(t)||(!this.practice&&this.game.roster[s][t]<=0))return false;this.selection[s]=t;if(this.selection.w&&this.selection.b){const vitality=this.practice?newGame().roster:this.game.roster;const centre=this.support.centre??36;this.world=makeArena(this.selection,this.support,vitality,{duration:this.duration,night:((centre>>3)+centre%8)%2===1,attacker:this.practice?'w':this.game.turn});this.phase='fight';}return true;}
 tick(dt,input){if(this.phase!=='fight')return;const result=stepArena(this.world,dt,input);if(result)this.finishDuel(result);}
 finishDuel(result){if(this.phase!=='fight')return;const attacker=this.game.turn;this.result={...result,attacker,practice:this.practice};
  if(!this.practice){if(result.winner===null){this.game=applyMove(this.game,this.pending,null);this.game=recordWounds(this.game,this.selection,null,result.damage);}
   else{this.game=applyMove(this.game,this.pending,result.winner===attacker);this.game=recordWounds(this.game,this.selection,result.winner,result.damage);}
  }this.phase='result';
 }
 continueAfterDuel(){if(this.phase!=='result')return;if(this.practice){this.practice=false;this.phase=this.returnPhase??'board';this.result=null;this.pending=null;this.checkEnd();return;}this.pending=null;this.phase='board';this.checkEnd();}
 checkEnd(){if(this.phase!=='board'&&this.phase!=='gameover')return;
  if(this.game.mode==='classic'){const status=classicStatus(this.game);if(status.over){this.phase='gameover';this.ending=status;}return;}
  const missing=['w','b'].filter(s=>!this.game.board.some(p=>p?.s===s&&p.t==='k'));
  if(missing.length){this.phase='gameover';this.ending={winner:missing.length===2?null:other(missing[0]),reason:missing.length===2?'Both kings fell':'King defeated'};return;}
  const empty=['w','b'].filter(s=>exhaust(this.game,s));if(empty.length){this.ending={winner:empty.length===2?null:other(empty[0]),loser:empty.length===1?empty[0]:null,reason:empty.length===2?'Both rosters exhausted':'Champion roster exhausted'};this.phase='continuation';this.offerStage='loser';this.offerIssue=continuationIssue(this.game);return;}
  if(this.game.half>=100||(this.game.repetitions?.[importPositionKey(this.game)]??0)>=3){this.phase='gameover';this.ending={winner:null,reason:this.game.half>=100?'Draw · fifty quiet moves':'Draw · repeated position'};return;}
  if(!this.game.board.some((p,i)=>p?.s===this.game.turn&&moves(this.game,i).length)){this.phase='gameover';this.ending={winner:null,reason:'No available moves'};}
 }
 requestChess(){if(this.phase==='continuation'&&!this.offerIssue){this.offerStage='winner';return true;}return false;}
 keepWin(){if(this.phase==='continuation'){this.phase='gameover';this.offerStage=null;}}
 acceptChess(){if(this.phase!=='continuation'||this.offerStage!=='winner'||this.offerIssue)return false;this.game.mode='classic';this.game.history.push('Both players agreed to continue as ordinary chess.');this.phase='board';this.offerStage=null;this.checkEnd();return true;}
}
// Imported separately to keep the repetition check shared with the chess engine.
import {positionKey as importPositionKey} from './engine.mjs';
