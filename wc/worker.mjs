// mAIa thinks here, off the main thread, so taps and the timer never stutter.
import { search } from './mcts.mjs';

onmessage = async ({ data: { id, game, state, sims } }) => {
    const G = await import(`./games/${game}.mjs`);
    postMessage({ id, move: search(G, state, sims) });
};
