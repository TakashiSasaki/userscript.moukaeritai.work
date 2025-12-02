

<!DOCTYPE html>
<html lang="en">
<head>
  <title>Gemini Export Button - Source code</title>
  <meta name="description" value="Source code for Gemini Export Button">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  
  <script src="/vite/assets/application-DVeNgXME.js" crossorigin="anonymous" type="module"></script><link rel="stylesheet" href="/vite/assets/application-CAsQgw0h.css" media="screen" />
    <meta name="csrf-param" content="authenticity_token" />
<meta name="csrf-token" content="y4s_vVo5hJAG-6VJo6HB4ScuC71RpONnr_hHk4ipeZAujrCoVllg2_nIeZH616CmgaL2CNB1beQ59stG2EfFcw" />
    <meta name="clckd" content="bf6242cc3039bff31a7815dff8ee247b" />
    <meta name="lhverifycode" content="32dc01246faccb7f5b3cad5016dd5033" />
  <link rel="canonical" href="https://greasyfork.org/en/scripts/533686-gemini-export-button/code">
  <link rel="icon" href="/vite/assets/blacklogo16-DftkYuVe.png">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans&amp;display=swap" media="print" onload="this.media='all'; this.onload=null;">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans&amp;display=swap"></noscript>

    <link rel="alternate" hreflang="x-default" href="/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="ar" href="/ar/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="be" href="/be/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="bg" href="/bg/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="ckb" href="/ckb/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="cs" href="/cs/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="da" href="/da/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="de" href="/de/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="el" href="/el/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="en" href="/en/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="eo" href="/eo/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="es" href="/es/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="es-419" href="/es-419/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="fi" href="/fi/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="fr" href="/fr/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="fr-CA" href="/fr-CA/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="he" href="/he/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="hr" href="/hr/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="hu" href="/hu/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="id" href="/id/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="it" href="/it/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="ja" href="/ja/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="ka" href="/ka/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="ko" href="/ko/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="mr" href="/mr/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="nb" href="/nb/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="nl" href="/nl/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="pl" href="/pl/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="pt-BR" href="/pt-BR/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="ro" href="/ro/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="ru" href="/ru/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="sk" href="/sk/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="sr" href="/sr/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="sv" href="/sv/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="th" href="/th/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="tr" href="/tr/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="uk" href="/uk/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="ug" href="/ug/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="vi" href="/vi/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="zh-CN" href="/zh-CN/scripts/533686-gemini-export-button/code">
      <link rel="alternate" hreflang="zh-TW" href="/zh-TW/scripts/533686-gemini-export-button/code">


  <link rel="search" href="/en/opensearch.xml" type="application/opensearchdescription+xml" title="Greasy Fork search" hreflang="en">

    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-7NMRNRYW7C"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-7NMRNRYW7C', {
        'ad_method': 'ea',
        'action': 'scripts/show_code'
      });
    </script>

    <script async src="https://media.ethicalads.io/media/client/ethicalads.min.js" onerror="if (typeof gtag !== 'undefined') { gtag('event', 'EthicalAds placement', { 'ea_campaign_type': '(error)' })};switchToEaFallback()"></script>

    <meta name="twitter:card" content="summary">
  <meta property="og:title" content="Gemini Export Button">
  <meta property="og:url" content="https://greasyfork.org/scripts/533686-gemini-export-button">
  <meta property="og:description" content="Adds a 📃 button that opens the menu, clicks “Export to…”, then highlights and clicks the “Export to Docs” button when it appears.">

</head>
<body>

  <header id="main-header">
    <div class="width-constraint">
      <div id="site-name">
        <a href="/en"><img alt="" width="96" height="96" src="/vite/assets/blacklogo96-CxYTSM_T.png" /></a>
        <div id="site-name-text">
          <h1><a href="/en">Greasy Fork</a></h1>
        </div>
      </div>
      <div id="site-nav">
        <div id="nav-user-info">
            <span class="sign-in-link"><a rel="nofollow" href="/en/users/sign_in?return_to=%2Fen%2Fscripts%2F533686-gemini-export-button%2Fcode">Sign in</a></span>

                      <form class="language-selector" action="/scripts/533686-gemini-export-button/code">
              <select class="language-selector-locale" name="locale" data-translate-url="https://github.com/greasyfork-org/greasyfork/wiki/Translating-Greasy-Fork">
                    <option data-language-url="/ar/scripts/533686-gemini-export-button/code" value="ar">
                      العَرَبِيةُ (ar)
                    </option>
                    <option data-language-url="/be/scripts/533686-gemini-export-button/code" value="be">
                      Беларуская (be)
                    </option>
                    <option data-language-url="/bg/scripts/533686-gemini-export-button/code" value="bg">
                      Български (bg)
                    </option>
                    <option data-language-url="/ckb/scripts/533686-gemini-export-button/code" value="ckb">
                      کوردیی ناوەندی (ckb)
                    </option>
                    <option data-language-url="/cs/scripts/533686-gemini-export-button/code" value="cs">
                      Čeština (cs)
                    </option>
                    <option data-language-url="/da/scripts/533686-gemini-export-button/code" value="da">
                      Dansk (da)
                    </option>
                    <option data-language-url="/de/scripts/533686-gemini-export-button/code" value="de">
                      Deutsch (de)
                    </option>
                    <option data-language-url="/el/scripts/533686-gemini-export-button/code" value="el">
                      Ελληνικά (el)
                    </option>
                    <option data-language-url="/en/scripts/533686-gemini-export-button/code" value="en" selected>
                      English (en)
                    </option>
                    <option data-language-url="/eo/scripts/533686-gemini-export-button/code" value="eo">
                      Esperanto (eo)
                    </option>
                    <option data-language-url="/es/scripts/533686-gemini-export-button/code" value="es">
                      Español (es)
                    </option>
                    <option data-language-url="/es-419/scripts/533686-gemini-export-button/code" value="es-419">
                      Español latinoaméricano (es-419)
                    </option>
                    <option data-language-url="/fi/scripts/533686-gemini-export-button/code" value="fi">
                      Suomi (fi)
                    </option>
                    <option data-language-url="/fr/scripts/533686-gemini-export-button/code" value="fr">
                      Français (fr)
                    </option>
                    <option data-language-url="/fr-CA/scripts/533686-gemini-export-button/code" value="fr-CA">
                      Français canadien (fr-CA)
                    </option>
                    <option data-language-url="/he/scripts/533686-gemini-export-button/code" value="he">
                      עברית (he)
                    </option>
                    <option data-language-url="/hr/scripts/533686-gemini-export-button/code" value="hr">
                      Hrvatski (hr)
                    </option>
                    <option data-language-url="/hu/scripts/533686-gemini-export-button/code" value="hu">
                      Magyar (hu)
                    </option>
                    <option data-language-url="/id/scripts/533686-gemini-export-button/code" value="id">
                      Bahasa Indonesia (id)
                    </option>
                    <option data-language-url="/it/scripts/533686-gemini-export-button/code" value="it">
                      Italiano (it)
                    </option>
                    <option data-language-url="/ja/scripts/533686-gemini-export-button/code" value="ja">
                      日本語 (ja)
                    </option>
                    <option data-language-url="/ka/scripts/533686-gemini-export-button/code" value="ka">
                      ქართული ენა (ka)
                    </option>
                    <option data-language-url="/ko/scripts/533686-gemini-export-button/code" value="ko">
                      한국어 (ko)
                    </option>
                    <option data-language-url="/mr/scripts/533686-gemini-export-button/code" value="mr">
                      मराठी (mr)
                    </option>
                    <option data-language-url="/nb/scripts/533686-gemini-export-button/code" value="nb">
                      Bokmål (nb)
                    </option>
                    <option data-language-url="/nl/scripts/533686-gemini-export-button/code" value="nl">
                      Nederlands (nl)
                    </option>
                    <option data-language-url="/pl/scripts/533686-gemini-export-button/code" value="pl">
                      Polski (pl)
                    </option>
                    <option data-language-url="/pt-BR/scripts/533686-gemini-export-button/code" value="pt-BR">
                      Português do Brasil (pt-BR)
                    </option>
                    <option data-language-url="/ro/scripts/533686-gemini-export-button/code" value="ro">
                      Română (ro)
                    </option>
                    <option data-language-url="/ru/scripts/533686-gemini-export-button/code" value="ru">
                      Русский (ru)
                    </option>
                    <option data-language-url="/sk/scripts/533686-gemini-export-button/code" value="sk">
                      Slovenčina (sk)
                    </option>
                    <option data-language-url="/sr/scripts/533686-gemini-export-button/code" value="sr">
                      srpski (sr)
                    </option>
                    <option data-language-url="/sv/scripts/533686-gemini-export-button/code" value="sv">
                      Svenska (sv)
                    </option>
                    <option data-language-url="/th/scripts/533686-gemini-export-button/code" value="th">
                      ภาษาไทย (th)
                    </option>
                    <option data-language-url="/tr/scripts/533686-gemini-export-button/code" value="tr">
                      Türkçe (tr)
                    </option>
                    <option data-language-url="/uk/scripts/533686-gemini-export-button/code" value="uk">
                      Українська (uk)
                    </option>
                    <option data-language-url="/ug/scripts/533686-gemini-export-button/code" value="ug">
                      ئۇيغۇرچە (ug)
                    </option>
                    <option data-language-url="/vi/scripts/533686-gemini-export-button/code" value="vi">
                      Tiếng Việt (vi)
                    </option>
                    <option data-language-url="/zh-CN/scripts/533686-gemini-export-button/code" value="zh-CN">
                      简体中文 (zh-CN)
                    </option>
                    <option data-language-url="/zh-TW/scripts/533686-gemini-export-button/code" value="zh-TW">
                      繁體中文 (zh-TW)
                    </option>
                <option value="help">Help us translate!</option>
              </select><input class="language-selector-submit" type="submit" value="→">
            </form>

        </div>
        <nav>
          <li class="scripts-index-link"><a href="/en/scripts">Scripts</a></li>
            <li class="forum-link"><a href="/en/discussions">Forum</a></li>
          <li class="help-link"><a href="/en/help">Help</a></li>
          <li class="with-submenu">
            <a href="#" onclick="return false">More</a>
            <nav>
              <li><a href="/en/search">Advanced search</a></li>
              <li><a href="/en/users">User list</a></li>
              <li><a href="/en/scripts/libraries">Libraries</a></li>
              <li><a href="/en/moderator_actions">Moderator log</a></li>
            </nav>
          </li>
        </nav>
      </div>

      <div id="mobile-nav">
        <div class="mobile-nav-opener">☰</div>
        <nav class="collapsed">
          <li class="scripts-index-link"><a href="/en/scripts">Scripts</a></li>
          <li class="forum-link"><a href="/en/discussions">Forum</a></li>
          <li class="help-link"><a href="/en/help">Help</a></li>
          <li><a href="/en/search">Advanced search</a></li>
          <li><a href="/en/users">User list</a></li>
          <li><a href="/en/scripts/libraries">Libraries</a></li>
          <li><a href="/en/moderator_actions">Moderator log</a></li>
            <li class="multi-link-nav">
              <span class="sign-in-link"><a rel="nofollow" href="/en/users/sign_in?return_to=%2Fen%2Fscripts%2F533686-gemini-export-button%2Fcode">Sign in</a></span>
            </li>
          <li>            <form class="language-selector" action="/scripts/533686-gemini-export-button/code">
              <select class="language-selector-locale" name="locale" data-translate-url="https://github.com/greasyfork-org/greasyfork/wiki/Translating-Greasy-Fork">
                    <option data-language-url="/ar/scripts/533686-gemini-export-button/code" value="ar">
                      العَرَبِيةُ (ar)
                    </option>
                    <option data-language-url="/be/scripts/533686-gemini-export-button/code" value="be">
                      Беларуская (be)
                    </option>
                    <option data-language-url="/bg/scripts/533686-gemini-export-button/code" value="bg">
                      Български (bg)
                    </option>
                    <option data-language-url="/ckb/scripts/533686-gemini-export-button/code" value="ckb">
                      کوردیی ناوەندی (ckb)
                    </option>
                    <option data-language-url="/cs/scripts/533686-gemini-export-button/code" value="cs">
                      Čeština (cs)
                    </option>
                    <option data-language-url="/da/scripts/533686-gemini-export-button/code" value="da">
                      Dansk (da)
                    </option>
                    <option data-language-url="/de/scripts/533686-gemini-export-button/code" value="de">
                      Deutsch (de)
                    </option>
                    <option data-language-url="/el/scripts/533686-gemini-export-button/code" value="el">
                      Ελληνικά (el)
                    </option>
                    <option data-language-url="/en/scripts/533686-gemini-export-button/code" value="en" selected>
                      English (en)
                    </option>
                    <option data-language-url="/eo/scripts/533686-gemini-export-button/code" value="eo">
                      Esperanto (eo)
                    </option>
                    <option data-language-url="/es/scripts/533686-gemini-export-button/code" value="es">
                      Español (es)
                    </option>
                    <option data-language-url="/es-419/scripts/533686-gemini-export-button/code" value="es-419">
                      Español latinoaméricano (es-419)
                    </option>
                    <option data-language-url="/fi/scripts/533686-gemini-export-button/code" value="fi">
                      Suomi (fi)
                    </option>
                    <option data-language-url="/fr/scripts/533686-gemini-export-button/code" value="fr">
                      Français (fr)
                    </option>
                    <option data-language-url="/fr-CA/scripts/533686-gemini-export-button/code" value="fr-CA">
                      Français canadien (fr-CA)
                    </option>
                    <option data-language-url="/he/scripts/533686-gemini-export-button/code" value="he">
                      עברית (he)
                    </option>
                    <option data-language-url="/hr/scripts/533686-gemini-export-button/code" value="hr">
                      Hrvatski (hr)
                    </option>
                    <option data-language-url="/hu/scripts/533686-gemini-export-button/code" value="hu">
                      Magyar (hu)
                    </option>
                    <option data-language-url="/id/scripts/533686-gemini-export-button/code" value="id">
                      Bahasa Indonesia (id)
                    </option>
                    <option data-language-url="/it/scripts/533686-gemini-export-button/code" value="it">
                      Italiano (it)
                    </option>
                    <option data-language-url="/ja/scripts/533686-gemini-export-button/code" value="ja">
                      日本語 (ja)
                    </option>
                    <option data-language-url="/ka/scripts/533686-gemini-export-button/code" value="ka">
                      ქართული ენა (ka)
                    </option>
                    <option data-language-url="/ko/scripts/533686-gemini-export-button/code" value="ko">
                      한국어 (ko)
                    </option>
                    <option data-language-url="/mr/scripts/533686-gemini-export-button/code" value="mr">
                      मराठी (mr)
                    </option>
                    <option data-language-url="/nb/scripts/533686-gemini-export-button/code" value="nb">
                      Bokmål (nb)
                    </option>
                    <option data-language-url="/nl/scripts/533686-gemini-export-button/code" value="nl">
                      Nederlands (nl)
                    </option>
                    <option data-language-url="/pl/scripts/533686-gemini-export-button/code" value="pl">
                      Polski (pl)
                    </option>
                    <option data-language-url="/pt-BR/scripts/533686-gemini-export-button/code" value="pt-BR">
                      Português do Brasil (pt-BR)
                    </option>
                    <option data-language-url="/ro/scripts/533686-gemini-export-button/code" value="ro">
                      Română (ro)
                    </option>
                    <option data-language-url="/ru/scripts/533686-gemini-export-button/code" value="ru">
                      Русский (ru)
                    </option>
                    <option data-language-url="/sk/scripts/533686-gemini-export-button/code" value="sk">
                      Slovenčina (sk)
                    </option>
                    <option data-language-url="/sr/scripts/533686-gemini-export-button/code" value="sr">
                      srpski (sr)
                    </option>
                    <option data-language-url="/sv/scripts/533686-gemini-export-button/code" value="sv">
                      Svenska (sv)
                    </option>
                    <option data-language-url="/th/scripts/533686-gemini-export-button/code" value="th">
                      ภาษาไทย (th)
                    </option>
                    <option data-language-url="/tr/scripts/533686-gemini-export-button/code" value="tr">
                      Türkçe (tr)
                    </option>
                    <option data-language-url="/uk/scripts/533686-gemini-export-button/code" value="uk">
                      Українська (uk)
                    </option>
                    <option data-language-url="/ug/scripts/533686-gemini-export-button/code" value="ug">
                      ئۇيغۇرچە (ug)
                    </option>
                    <option data-language-url="/vi/scripts/533686-gemini-export-button/code" value="vi">
                      Tiếng Việt (vi)
                    </option>
                    <option data-language-url="/zh-CN/scripts/533686-gemini-export-button/code" value="zh-CN">
                      简体中文 (zh-CN)
                    </option>
                    <option data-language-url="/zh-TW/scripts/533686-gemini-export-button/code" value="zh-TW">
                      繁體中文 (zh-TW)
                    </option>
                <option value="help">Help us translate!</option>
              </select><input class="language-selector-submit" type="submit" value="→">
            </form>
</li>
        </nav>
      </div>

      <script>
        /* submit is handled by js if enabled */
        document.querySelectorAll(".language-selector-submit").forEach((lss) => { lss.style.display = "none" })
      </script>
    </div>
  </header>

  <div class="width-constraint">

      <section id="script-info">
    <ul id="script-links" class="tabs">
      <li><a href="/en/scripts/533686-gemini-export-button"><span>Info</span></a></li>
      <li class="current"><span>Code</span></li>
      <li><a href="/en/scripts/533686-gemini-export-button/versions"><span>History</span></a></li>
      <li><a href="/en/scripts/533686-gemini-export-button/feedback"><span>Feedback (0)</span></a></li>
      <li><a href="/en/scripts/533686-gemini-export-button/stats"><span>Stats</span></a></li>
    </ul>
    <header>
      <h2>Gemini Export Button</h2>
      <p id="script-description" class="script-description">Adds a 📃 button that opens the menu, clicks “Export to…”, then highlights and clicks the “Export to Docs” button when it appears.</p>
    </header>
    <div id="script-content">
      

      <div id="install-area">
          
<a class="install-link" data-install-format="js" data-ping-url="/scripts/533686/install-ping" data-post-install-url="https://greasyfork.org/en/scripts/533686-gemini-export-button/post-install" data-ip-address="133.71.3.49" data-script-id="533686" data-ping-key="b18f88716a8821a6189fb36b6e41aa3352a67d2b" data-is-previous-version="false" data-previous-version-warning="This is not the latest version of this script. If you install it, you will never be updated to a newer version. Install anyway?" rel="nofollow" data-script-name="Gemini Export Button" data-script-namespace="https://x.com/TakashiSasaki/tampermonkey/gemini-export" data-script-version="0.9.3" data-update-label="Update to version 0.9.3" data-downgrade-label="Downgrade to version 0.9.3" data-reinstall-label="Reinstall version 0.9.3" href="https://update.greasyfork.org/scripts/533686/Gemini%20Export%20Button.user.js">Install this script</a><a class="install-help-link" title="How to install" rel="nofollow" href="/en/help/installing-user-scripts">?</a>
      </div>



<dialog id="installation-instructions-modal-js" class="modal" closedby="any">
  <header class="modal__header" aria-labelledby="installation-instructions-modal-title">
    <h3 class="modal__title" id="installation-instructions-modal-title">
      How to install
    </h3>
    <button class="modal__close modal__cancel" aria-label="Close modal"></button>
  </header>
  <main class="modal__content" id="installation-instructions-modal-content">
    <p class="installation-instructions-modal-content-firefox">
      You will need to install an extension such as <a target="tampermonkey" href="https://addons.mozilla.org/firefox/addon/tampermonkey/">Tampermonkey</a>, <a target="greasemonkey" href="https://addons.mozilla.org/firefox/addon/greasemonkey/">Greasemonkey</a> or <a target="violentmonkey" href="https://addons.mozilla.org/firefox/addon/violentmonkey/">Violentmonkey</a> to install this script.
    </p>
    <p class="installation-instructions-modal-content-chrome">
      You will need to install an extension such as <a target="tampermonkey" href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo">Tampermonkey</a> or <a target="violentmonkey" href="https://chrome.google.com/webstore/detail/violent-monkey/jinjaccalgkegednnccohejagnlnfdag">Violentmonkey</a> to install this script.
    </p>
    <p class="installation-instructions-modal-content-opera">
      You will need to install an extension such as <a target="tampermonkey" href="https://addons.opera.com/extensions/details/tampermonkey-beta/">Tampermonkey</a> or <a target="violentmonkey" href="https://violentmonkey.github.io/get-it/">Violentmonkey</a> to install this script.
    </p>
    <p class="installation-instructions-modal-content-safari">
      You will need to install an extension such as <a target="tampermonkey" href="https://www.tampermonkey.net/?browser=safari">Tampermonkey</a> or <a target="Userscripts" href="https://apps.apple.com/app/userscripts/id1463298887">Userscripts</a> to install this script.
    </p>
    <p class="installation-instructions-modal-content-edge">
      You will need to install an extension such as <a target="tampermonkey" href="https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd">Tampermonkey</a> to install this script.
    </p>
    <p class="installation-instructions-modal-content-other">
      You will need to install a user script manager extension to install this script.
    </p>
    <p class="installation-instructions-modal-content-bypass">
      <a href="#">(I already have a user script manager, let me install it!)</a>
    </p>
  </main>
  <footer class="modal__footer">
    <button class="modal__btn modal__cancel">
      OK
    </button>
  </footer>
</dialog>

<dialog id="installation-instructions-modal-css" class="modal" closedby="any">
  <header class="modal__header" aria-labelledby="installation-instructions-modal-title">
    <h3 class="modal__title" id="installation-instructions-modal-title">
      How to install
    </h3>
    <button class="modal__close modal__cancel" aria-label="Close modal"></button>
  </header>
  <main class="modal__content" id="installation-instructions-modal-content">
    <p class="installation-instructions-modal-content-firefox">
      You will need to install an extension such as <a target="stylus" href="https://addons.mozilla.org/firefox/addon/styl-us/">Stylus</a> to install this style.
    </p>
    <p class="installation-instructions-modal-content-chrome">
      You will need to install an extension such as <a target="stylus" href="https://chrome.google.com/webstore/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne">Stylus</a> to install this style.
    </p>
    <p class="installation-instructions-modal-content-opera">
      You will need to install an extension such as <a target="stylus" href="https://addons.opera.com/extensions/details/stylus/">Stylus</a> to install this style.
    </p>
    <p class="installation-instructions-modal-content-safari">
      You will need to install a user style manager extension to install this style.
    </p>
    <p class="installation-instructions-modal-content-edge">
      You will need to install a user style manager extension to install this style.
    </p>
    <p class="installation-instructions-modal-content-other">
      You will need to install a user style manager extension to install this style.
    </p>
    <p class="installation-instructions-modal-content-bypass">
      <a href="#">(I already have a user style manager, let me install it!)</a>
    </p>
  </main>
  <footer class="modal__footer">
    <button class="modal__btn modal__cancel">
      OK
    </button>
  </footer>
</dialog>



<div id="script-feedback-suggestion">
      <a rel="nofollow" href="https://x.com/TakashiSasaki">Visit the author&#39;s site for support</a>, <a rel="nofollow" href="/en/scripts/533686-gemini-export-button/feedback#post-discussion">ask a question, post a review</a>, or <a rel="nofollow" href="/en/reports/new?item_class=script&amp;item_id=533686">report the script</a>.
</div>


  <div class="ad ad-ea">
    <div id="script-show-code-ea" class="flat ethical-ads ethical-ads-text" data-ea-publisher="greasyfork" data-ea-type="text"></div>
  </div>

<script src="https://cdn.jsdelivr.net/gh/google/code-prettify@master/loader/run_prettify.js?lang=css"></script>

<div>
  <input type="checkbox" id="wrap-lines" checked value="1"><label for="wrap-lines" class="checkbox-label">Wrap lines</label>
</div>
<div class="code-container">
  <pre class="prettyprint linenums wrap lang-js">// ==UserScript==
// @name         Gemini Export Button
// @namespace    https://x.com/TakashiSasaki/tampermonkey/gemini-export
// @version      0.9.3
// @description  Adds a 📃 button that opens the menu, clicks “Export to…”, then highlights and clicks the “Export to Docs” button when it appears.
// @author       Takashi Sasaki
// @homepage     https://x.com/TakashiSasaki
// @supportURL   https://x.com/TakashiSasaki
// @license      MIT
// @match        https://gemini.google.com/app/*
// @icon         https://x.com/TakashiSasaki/path/to/icon.png
// @compatible   tampermonkey
// @compatible   violentmonkey
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    &#39;use strict&#39;;

    const BUTTON_CLASS = &#39;tm-cascade-highlight-click-button&#39;;

    /**
     * Dispatches a click event on the given element.
     * @param {Element} el
     */
    function simulateClick(el) {
        if (!el) return;
        el.dispatchEvent(new MouseEvent(&#39;click&#39;, {
            bubbles: true,
            cancelable: true,
            view: window
        }));
    }

    /**
     * Waits for an element matching `selector` to appear in the DOM,
     * then calls `callback` with that element.
     * Polls every 100ms, gives up after `timeout` ms.
     * @param {string} selector
     * @param {function(Element):void} callback
     * @param {number} timeout
     */
    function waitForSelector(selector, callback, timeout = 5000) {
        const interval = 100;
        let elapsed = 0;
        const handle = setInterval(() =&gt; {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(handle);
                callback(el);
            } else if ((elapsed += interval) &gt;= timeout) {
                clearInterval(handle);
                console.warn(`waitForSelector timed out: ${selector}`);
            }
        }, interval);
    }

    /**
     * Handles the cascade:
     * 1) Open the “︙” menu
     * 2) Click “Export to…”
     * 3) Highlight and click “Export to Docs”
     * @param {Element} menuBtn
     */
    function handleCascade(menuBtn) {
        // Step 1: open the menu
        simulateClick(menuBtn);

        // Step 2: wait for “Export to…” button and click it
        waitForSelector(&#39;button[data-test-id=&quot;export-button&quot;]&#39;, exportBtn =&gt; {
            simulateClick(exportBtn);

            // Step 3: wait for “Export to Docs” button, highlight it, and click it
            const docsSelector = &#39;[id^=&quot;cdk-dialog-&quot;] actions-bottom-sheet &gt; div &gt; div.options.ng-star-inserted &gt; div &gt; button:nth-child(1)&#39;;
            waitForSelector(docsSelector, docsBtn =&gt; {
                // Highlight the button itself
                docsBtn.style.setProperty(&#39;background-color&#39;, &#39;yellow&#39;, &#39;important&#39;);
                docsBtn.style.setProperty(&#39;border&#39;, &#39;2px solid red&#39;, &#39;important&#39;);
                docsBtn.style.setProperty(&#39;outline&#39;, &#39;2px solid orange&#39;, &#39;important&#39;);
                // Highlight its content container
                const content = docsBtn.querySelector(&#39;.item-button-content&#39;);
                if (content) {
                    content.style.setProperty(&#39;background-color&#39;, &#39;yellow&#39;, &#39;important&#39;);
                    content.style.setProperty(&#39;border&#39;, &#39;1px dashed orange&#39;, &#39;important&#39;);
                }
                // Step 4: click the highlighted button
                simulateClick(docsBtn);
            });
        });
    }

    /**
     * Creates the custom 📃 button next to the existing menu button.
     * @param {Element} menuButtonElement
     * @returns {HTMLButtonElement}
     */
    function createCustomButton(menuButtonElement) {
        const btn = document.createElement(&#39;button&#39;);
        btn.innerText = &#39;📃&#39;;
        btn.className = BUTTON_CLASS;
        Object.assign(btn.style, {
            marginLeft: &#39;8px&#39;,
            padding: &#39;4px 8px&#39;,
            border: &#39;none&#39;,
            borderRadius: &#39;4px&#39;,
            backgroundColor: &#39;#e8f0fe&#39;,
            color: &#39;#202124&#39;,
            cursor: &#39;pointer&#39;,
            fontSize: &#39;14px&#39;
        });
        btn.title = &#39;Export cascade: menu → export → highlight &amp; click Docs&#39;;

        btn.addEventListener(&#39;click&#39;, e =&gt; {
            e.stopPropagation();
            handleCascade(menuButtonElement);
        });

        return btn;
    }

    /**
     * Injects the custom button into each response header.
     */
    function addButtons() {
        document.querySelectorAll(&#39;div.menu-button-wrapper&#39;).forEach(wrapper =&gt; {
            if (wrapper.nextSibling?.classList?.contains(BUTTON_CLASS)) return;
            const menuBtn = wrapper.querySelector(&#39;button&#39;);
            if (menuBtn) {
                const customBtn = createCustomButton(menuBtn);
                wrapper.parentNode.insertBefore(customBtn, wrapper.nextSibling);
            }
        });
    }

    // Observe the page for dynamic content changes
    new MutationObserver(addButtons).observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Initial injection
    addButtons();
})();
</pre>
</div>

    </div>
  </section>

  </div>

    <script>
      (function (d) {
      window.rum = {key: '29razx6j'};
      var script = d.createElement('script');
      script.src = 'https://cdn.perfops.net/rom3/rom3.min.js';
      script.type = 'text/javascript';
      script.defer = true;
      script.async = true;
      d.getElementsByTagName('head')[0].appendChild(script);
      })(document);
    </script>
</body>
</html>

