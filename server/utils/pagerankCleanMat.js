// The PageTrust algorithm based on:
// How to rank web pages when negative links are allowed?
// http://perso.uclouvain.be/paul.vandooren/publications/deKerchoveV08b.pdf
// And eigentrust/egentrust++

function printM(m, name) {
  console.log(name, ':\n', JSON.stringify(m).replace(/\]\,\[/g, '],\n['));
}

function objectToMatrix(_inputs, params) {
  let inputs = Object.keys(_inputs);
  let dictionary = {};
  inputs.forEach((key, i) => dictionary[key] = i);
  let N = inputs.length;
  let G = [];
  let g = {};
  let neg = {};
  let P = [];
  let danglingNodes = [];

  inputs.forEach((el, i) => {
    let upvotes = new Array(N).fill(0);
    let downvotes = new Array(N).fill(0);

    let degree = 0;
    Object.keys(_inputs[el]).forEach(vote => {
      let w = _inputs[el][vote][params.weight];
      let n = _inputs[el][vote][params.negative] || 0;
      // eigentrust++ weights
      w = Math.max((w - n) / (w + n), 0);
      _inputs[el][vote].w = w;
      if (w > 0) degree += w;
    });

    if (degree === 0) {
      danglingNodes.push(i);
      degree = 1;
    }

    Object.keys(_inputs[el]).forEach(vote => {
      let w = _inputs[el][vote].w;
      let n = _inputs[el][vote][params.negative] || 0;
      upvotes[dictionary[vote]] = w / degree;
      if (n) {
        n /= _inputs[el][vote].total;
        neg[i] = neg[i] || {};
        neg[i][dictionary[vote]] = n;
        downvotes[dictionary[vote]] = n;
      }
    });

    G[i] = upvotes;
    P[i] = downvotes;
  });
  // printM(G, 'G');
  // printM(P, 'P');
  return { neg, g, G, N, P, dictionary, danglingNodes };
}

function formatOutput(x, dictionary, inputs, params) {
  let result = {};
  // let e = 0;
  // let sum = 0;
  Object.keys(inputs).forEach((node, i) => {
    // e += x[i] - params.nstart[node];
    // if (x[i] - params.nstart[node] > 1e17) {
    //   console.log(x[i] - params.nstart[node], node);
    // }
    // sum += x[i];
    return result[node] = x[i];
  });
  return result;
}


export default function pagerank(inputs, params) {
  if (!params) params = {};
  if (!params.alpha) params.alpha = 0.85;
  if (!params.personalization) params.personalization = null;
  if (!params.max_iter) params.max_iter = 500;
  if (!params.tol) params.tol = 1.0e-6;
  if (!params.weight) params.weight = 'weight';
  if (!params.negative) params.negative = 'negative';
  if (!params.beta) params.beta = 2;
  if (!params.M) params.M = 1;

  let now = new Date();

  let { neg, g, G, P, N, dictionary, danglingNodes } = objectToMatrix(inputs, params);

  let p = new Array(N).fill(0);
  if (!params.personalization) {
    p = new Array(N).fill(1.0 / N);
  } else {
    let keys = Object.keys(params.personalization);
    let degree = keys.reduce((prev, key) => prev + params.personalization[key], 0);
    keys.forEach(key => {
      p[dictionary[key]] = params.personalization[key] / degree;
    });
    // console.log('personalization ', p);
  }

  let danglingWeights = [];
  if (!params.dangling) {
    // Use personalization vector if dangling vector not specified
    danglingWeights = p;
  } else {
    danglingWeights = new Array(N).fill(1 / N);
  }

  let x;
  if (!params.nstart) {
    x = [...p];
  } else {
    // console.log('start ', params.nstart);
    x = new Array(N).fill(0);
    let keys = Object.keys(params.nstart);
    let degree = keys.reduce((prev, key) => params.nstart[key] + prev, 0);
    let sum = 0;
    keys.forEach(key => {
      if (!degree) return;
      let i = dictionary[key];
      x[i] = params.nstart[key];
      sum += params.nstart[key];
    });
    console.log('start sum ', sum);
  }

  let tildeP = P.map(arr => arr.slice());
  let iter;
  let T = new Array(N).fill(0).map(() => new Array(N).fill(0));

  let danglesum = 0;

  console.log('matrix setup time ', ((new Date()).getTime() - now) / 1000 + 's');

  let xlast;
  for (iter = 0; iter < params.max_iter; iter++) {
    xlast = [...x];

    x = new Array(N).fill(0);
    let lastP = P.map(arr => arr.slice());

    danglesum = 0;
    danglingNodes.forEach(node => danglesum += xlast[node]);
    danglesum *= params.alpha;

    // Iterate through nodes;
    for (let i = 0; i < N; i++) {
      let TNi = new Array(N).fill(0);

      for (let j = 0; j < N; j++) {
        x[i] += params.alpha * G[j][i] * xlast[j];

        TNi[j] = params.alpha * G[j][i] * xlast[j] +
          xlast[j] * params.M * (1 - params.alpha) * p[i];
      }
      x[i] += (1.0 - params.alpha) * p[i] + danglesum * danglingWeights[i];


      for (let j = 0; j < N; j++) {
        let denom = x[i] || 1;
        T[i][j] = TNi[j] / denom;
      }

      // x[i] *= (1 - tildeP[i][i]) ** params.beta;


      // UPDATE tildeP
      for (let j = 0; j < N; j++) {
        tildeP[i][j] = 0;
        for (let k = 0; k < N; k++) {
          tildeP[i][j] += T[i][k] * lastP[k][j];
        }
        // UPDATE P
        if (neg[i] && neg[i][j]) P[i][j] = neg[i][j];
        else if (i === j) P[i][j] = 0;
        else P[i][j] = tildeP[i][j];
      }
    }


    // normalize
    let sum = x.reduce((prev, next) => prev + next, 0);
    console.log('sum', sum);

    let err = 0.0;
    x = x.map((el, i) => {
      el /= sum;
      err += Math.abs(el - xlast[i]);
      return el;
    });

    if (err < N * params.tol) {
      console.log('iterations ', iter);
      console.log(err);
      // printM(T, 'T');
      // printM(tildeP, 'tildeP');
      let elapsed = (new Date()).getTime() - now.getTime();
      console.log('elapsed time: ', elapsed / 1000, 's');
      return formatOutput(x, dictionary, inputs, params);
    }
    console.log('interation', iter, 'error', err);
  }

  // printM(T, 'T');
  // printM(tildeP, 'tildeP');
  console.warn('pagerank: power iteration failed to converge in ' +
               params.iter_max + ' iterations.');
  return formatOutput(x, dictionary, inputs, params);
}
