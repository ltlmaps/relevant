import React from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { matchRoutes, renderRoutes } from 'react-router-config';
import { compose } from 'redux';
import { Provider } from 'react-redux';
import { setUser, setCommunity } from 'modules/auth/auth.actions';
import routes from 'modules/_app/web/routes';
import configureStore from 'core/web/configureStore';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import path from 'path';
import { AppRegistry } from 'react-native-web';

import { ChunkExtractor, ChunkExtractorManager } from '@loadable/server';

const { NODE_ENV } = process.env;
const sheet = new ServerStyleSheet();

const statsFile = path.resolve('app/public/dist/loadable-stats.json');

// This is the stats file generated by webpack loadable plugin
// We create an extractor from the statsFile
let extractor = new ChunkExtractor({ statsFile, entrypoints: 'app' });


export function createInitialState(req) {
  return {
    auth: {
      confirmed: !req.unconfirmed,
      // TODO - get this from req.user
      community: 'relevant'
    }
  };
}

export const initStore = compose(
  configureStore,
  createInitialState
);

export default async function handleRender(req, res) {
  const store = initStore(req);
  // TODO - get rid of this - need to convert util/api to middleware
  // and populate user store with req.user
  store.dispatch(setCommunity(store.getState().auth.community));
  if (req.user) store.dispatch(setUser(req.user));

  try {
    await handleRouteData({ req, store });
    const { app, css } = renderApp({ url: req.url, store });
    // console.log('app', app);

    const html = renderFullPage({ app, css, initialState: store.getState() });
    res.send(html);
  } catch (err) {
    console.log('RENDER ERROR', err) // eslint-disable-line
    res.send(renderFullPage('', store.getState()));
  }
}

export function renderFullPage({ app, css, initialState }) {
  let styleTags = '';
  let styledComponentsTags = '';

  // load extracted styles in head when in production
  if (NODE_ENV === 'development') {
    extractor = new ChunkExtractor({ statsFile, entrypoints: 'app' });
  } else {
    styledComponentsTags = sheet.getStyleTags();
    styleTags = extractor.getStyleTags();
  }
  const meta = fetchMeta(initialState);

  const scriptTags = extractor.getScriptTags();

  return `<!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

        <title>Relevant: A Social News Reader</title>
        <link rel="icon" href="https://relevant.community/favicon.ico?v=2" />
        <meta name="description" content="${meta.description}" />
        <meta property="og:description" content="${meta.description}" />
        <meta property="og:title" content="${meta.title}" />
        <meta property="og:url" content="${meta.url}" />
        <meta property="og:image" content="${meta.image}" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@4realglobal" />
        <meta name="twitter:title" content="${meta.title}" />
        <meta name="twitter:description" content="${meta.description}" />
        <meta name="twitter:image" content="${meta.image}" />

        ${styleTags}
        ${css}
        ${styledComponentsTags}

        <!-- Global site tag (gtag.js) - Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=UA-51795165-6"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'UA-51795165-6');
        </script>

        <!-- Facebook Pixel Code -->
        <script>
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '286620198458049', {
        em: 'insert_email_variable'
        });
        fbq('track', 'PageView');
        </script>
        <noscript><img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=286620198458049&ev=PageView&noscript=1"
        /></noscript>
        <!-- DO NOT MODIFY -->
        <!-- End Facebook Pixel Code -->
      </head>
      <body>
        <div id="app">${app}</div>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}
        </script>

        ${scriptTags}
      </body>
    </html>
  `;
}

export function fetchMeta(initialState) {
  let title;
  let description;
  let image;
  let url;

  const { community } = initialState.auth;
  if (initialState.posts.posts) {
    const postId = Object.keys(initialState.posts.posts)[0];
    if (postId) {
      let post = initialState.posts.posts[postId];
      if (post.metaPost) {
        post = initialState.posts.links[post.metaPost] || {};
      }
      title = post.title;
      image = post.image;
      description = post.body;
      url = `https://relevant.community/${community}/post/${postId}`;
    }
  }
  title = title || 'Relevant: A Social News Reader';
  image = image || 'https://relevant.community/img/fbimg.png';
  url = url || 'https://relevant.community/';
  description =
    description ||
    'Relevant is a social news reader that values quality over clicks. Our mission is to create a token-backed qualitative metric for the information economy — making the human values of veracity, expertise and agency economically valuable.';
  return { title, description, image, url };
}


export async function handleRouteData({ req, store }) {
  const branch = matchRoutes(routes, req.url);
  const promises = branch.map(async ({ route, match }) => {
    const { params } = match;
    const { fetchData } = route.component;
    // TODO can you get away without sending params and send whole store?
    return fetchData instanceof Function ?
      fetchData(store.dispatch, params) : Promise.resolve(null);
  });
  return Promise.all(promises);
}

export function renderApp({ url, store }) {
  const context = {};

  const App = () => (<Provider store={store}>
    <div className="parent">
      <StaticRouter location={url} context={context}>
        {renderRoutes(routes)}
      </StaticRouter>
    </div>
  </Provider>);

  AppRegistry.registerComponent('App', () => App);
  const { getStyleElement } = AppRegistry.getApplication('App', store.getState());
  const css = renderToStaticMarkup(getStyleElement());

  const app = renderToString(
    <ChunkExtractorManager extractor={extractor}>
      <StyleSheetManager sheet={sheet.instance}>
        {App()}
      </StyleSheetManager>
    </ChunkExtractorManager>
  );
  return { app, css };
}


// Might be useful to go through the whole stack?
// function fetchComponentData(dispatch, components, params, req) {
//   const promises = components
//   .filter(component => component && component.fetchData)
//   .map(component => component.fetchData)
//   .map(fetchData => fetchData(dispatch, params, req));
//   return Promise.all(promises);
// }

