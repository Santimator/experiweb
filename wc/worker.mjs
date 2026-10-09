// mAIa thinks here, off the main thread, so taps and the timer never stutter.
import { search } from './mcts.mjs';

// Card games bring their own ai(state, level), which only looks at what mAIa's seat can see;
// everything else uses the generic search.
onmessage = async ({ data: { id, game, state, sims, level } }) => {
    const G = await import(`./games/${game}.mjs`);
    postMessage({ id, move: G.ai ? G.ai(state, level) : search(G, state, sims) });
};
