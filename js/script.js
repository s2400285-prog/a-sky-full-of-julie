(() => {
  "use strict";

  const svgNamespace = "http://www.w3.org/2000/svg";
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const all = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const chapters = new Map(all(".scene").map((scene) => [scene.id, scene]));
  const chapterLinks = all(".chapter-nav [data-goto]");
  const chapterNav = $("#chapter-nav");
  const chapterToggle = $(".chapter-toggle");
  const topbar = $(".topbar");
  const wipe = $("#scene-wipe");
  const particleLayer = $("#particles");

  const photos = [
    {
      path: "assets/images/julie1.jpg",
      title: "A piece of time",
      caption: "If I could slip one moment into my pocket and carry it into every ordinary day, it would be one that had you in it."
    },
    {
      path: "assets/images/julie2.jpg",
      title: "Close to my heart",
      caption: "I love having a photograph I can come back to when I miss you. For a moment, you feel a little nearer."
    }
  ];

  const notes = {
    cloud: {
      label: "Delivered by a cloud",
      title: "In case you forgot today",
      text: "I’m glad you exist, Julie. I’m glad I get to hear what made you laugh, what you’re looking forward to, and all the little things you could have kept to yourself.",
      icon: "i-envelope"
    },
    star: {
      label: "Just between this star and Julie",
      title: "You crossed my mind again",
      text: "Sometimes I’m halfway through an ordinary day and suddenly think of you. I always wish I could lean over and tell you what I was doing right before you made me smile.",
      icon: "i-star"
    },
    heart: {
      label: "The smallest blue heart",
      title: "A soft place to land",
      text: "I hope you feel safe enough with me to tell me when you need quiet, when you need a little space, or when you just want someone to stay close.",
      icon: "i-heart"
    },
    sunrise: {
      label: "A secret in the first light",
      title: "For an ordinary tomorrow",
      text: "When you wake up tomorrow, I hope the morning is gentle with you. Somewhere in mine, I’ll be thanking God for another day to know you a little better.",
      icon: "i-star"
    }
  };

  const promises = [
    "I promise to appreciate you, even in the smallest things.",
    "I promise to listen and understand instead of simply assuming.",
    "I promise to keep growing and becoming someone you can be proud of.",
    "I promise to pray for you and support your dreams.",
    "I promise that my love will be shown through actions, not words alone."
  ];

  const songPath = "assets/music/our-song.mp3";
  const filmPath = "assets/videos/our-moment.mp4";
  const mediaChecks = new Map();
  const pad = (number) => String(number).padStart(2, "0");
  const dialogs = all("dialog");
  let activeScene = null;
  let pendingChapter = null;
  let routeTimers = [];
  const chapterWipes = {
    memories: "wave",
    moment: "wave",
    promises: "night",
    sunrise: "dawn"
  };

  function makeSymbol(symbol, viewBox = "0 0 200 190") {
    const svg = document.createElementNS(svgNamespace, "svg");
    const use = document.createElementNS(svgNamespace, "use");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", "#" + symbol);
    svg.append(use);
    return svg;
  }

  function burst(target, { count = 16, layer = particleLayer, rising = false } = {}) {
    if (motion.matches) return;

    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const fragment = document.createDocumentFragment();
    const range = Math.min(innerWidth, innerHeight, 800);

    while (layer.childElementCount > 70 - count) layer.firstElementChild.remove();

    for (let index = 0; index < count; index += 1) {
      const particle = makeSymbol("blue-heart");
      const angle = rising ? -Math.PI * (.12 + .76 * Math.random()) : 2 * Math.PI * index / count;
      const distance = range * (.13 + .3 * Math.random());
      particle.classList.add("burst-particle");
      particle.style.setProperty("--x", x + "px");
      particle.style.setProperty("--y", y + "px");
      particle.style.setProperty("--dx", Math.cos(angle) * distance + "px");
      particle.style.setProperty("--dy", Math.sin(angle) * distance + "px");
      particle.style.setProperty("--size", (12 + 24 * Math.random()) + "px");
      particle.style.setProperty("--turn", (-45 + 90 * Math.random()) + "deg");
      particle.style.setProperty("--length", (800 + 670 * Math.random()) + "ms");
      particle.addEventListener("animationend", () => particle.remove(), { once: true });
      fragment.append(particle);
    }
    layer.append(fragment);
  }

  function buildAtmosphere() {
    for (const region of all("[data-ambient]")) {
      const count = region.dataset.ambient === "dawn" ? 11 : 7;
      for (let index = 0; index < count; index += 1) {
        const heart = makeSymbol("blue-heart");
        heart.classList.add("ambient-heart");
        heart.style.setProperty("--left", (6 + (index * 19) % 88) + "%");
        heart.style.setProperty("--size", (10 + (index * 7) % 20) + "px");
        heart.style.setProperty("--time", (16 + (index * 3) % 15) + "s");
        heart.style.setProperty("--delay", (-3 - index * 3.1) + "s");
        heart.style.setProperty("--alpha", region.dataset.ambient === "night" ? ".37" : ".61");
        heart.style.setProperty("--sway", ((index % 2 ? 1 : -1) * (18 + index * 3)) + "px");
        region.append(heart);
      }
    }

    const field = $("#star-field");
    for (let index = 0; index < 62; index += 1) {
      const star = document.createElement("i");
      star.className = "star-speck";
      star.style.setProperty("--top", ((index * 37.09) % 100) + "%");
      star.style.setProperty("--left", ((index * 19.37 + 7) % 100) + "%");
      star.style.setProperty("--size", (1 + (index % 5) * .32) + "px");
      star.style.setProperty("--alpha", String(.22 + (index % 6) * .115));
      star.style.setProperty("--delay", (-index / 9) + "s");
      field.append(star);
    }
  }

  let parallaxFrame = 0;
  const setParallax = (scene, x, y) => {
    scene.style.setProperty("--px", x + "px");
    scene.style.setProperty("--py", y + "px");
  };
  for (const scene of [chapters.get("welcome"), chapters.get("view")]) {
    scene.addEventListener("pointermove", (event) => {
      if (motion.matches || event.pointerType !== "mouse") return;
      const x = (event.clientX / window.innerWidth - .5) * 20;
      const y = (event.clientY / window.innerHeight - .5) * 17;
      cancelAnimationFrame(parallaxFrame);
      parallaxFrame = requestAnimationFrame(() => setParallax(scene, x, y));
    }, { passive: true });
    scene.addEventListener("pointerleave", () => {
      cancelAnimationFrame(parallaxFrame);
      setParallax(scene, 0, 0);
    });
  }

  function moveVectors(scene, moving) {
    if (!scene) return;
    for (const path of all("[data-flight]", scene)) {
      if (moving && !motion.matches) path.beginElement?.();
      else path.endElement?.();
    }
  }

  const scrollObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in-view");
        scrollObserver.unobserve(entry.target);
        if (entry.target.classList.contains("letter-paper") && !letterWasPlayed) startLetter();
      }
    }, { threshold: .08 })
    : null;

  function watchScrollReveals(scene) {
    const targets = all(".chapter-footer, .letter-paper, .gallery-hint, .film-figure figcaption, .bible-verse, .final-letter", scene);
    for (const target of targets) {
      if (target.classList.contains("is-in-view")) continue;
      if (scrollObserver && !motion.matches) {
        target.classList.add("scroll-target");
        scrollObserver.observe(target);
      } else {
        target.classList.add("is-in-view");
      }
    }
    if (!scrollObserver && scene.id === "letters" && !letterWasPlayed) startLetter();
  }

  function setChapterMenu(open) {
    topbar.classList.toggle("menu-open", open);
    chapterToggle.setAttribute("aria-expanded", String(open));
  }

  chapterToggle.addEventListener("click", () => {
    setChapterMenu(chapterToggle.getAttribute("aria-expanded") !== "true");
  });

  document.addEventListener("click", (event) => {
    if (!topbar.contains(event.target)) setChapterMenu(false);
  });

  topbar.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && topbar.classList.contains("menu-open")) {
      setChapterMenu(false);
      chapterToggle.focus();
    }
  });

  $(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    $("#main").focus();
  });

  function activateChapter(id, focus = true) {
    const scene = chapters.get(id);
    if (!scene || scene === activeScene) return;

    if (activeScene?.id === "letters") finishLetter();
    if (activeScene?.id === "moment") film.pause();
    moveVectors(activeScene, false);
    for (const dialog of dialogs) if (dialog.open) dialog.close();

    for (const chapter of chapters.values()) {
      chapter.hidden = chapter !== scene;
      chapter.classList.toggle("is-active", chapter === scene);
    }

    activeScene = scene;
    document.body.dataset.chapter = id;
    chapterNav.hidden = id === "welcome";
    chapterToggle.hidden = id === "welcome";
    setChapterMenu(false);

    for (const link of chapterLinks) {
      if (link.dataset.goto === id) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    const index = chapterLinks.findIndex((link) => link.dataset.goto === id);
    if (index >= 0) $("#chapter-position").textContent = pad(index + 1) + " / " + pad(chapterLinks.length);

    $("#soundtrack").hidden = false;
    moveVectors(scene, true);
    watchScrollReveals(scene);

    if (id === "memories") loadPhotos();
    if (id === "moment") checkFilm();

    if (focus) {
      window.scrollTo(0, 0);
      $("h1", scene).focus({ preventScroll: true });
    }
  }

  function clearTransition() {
    for (const timer of routeTimers) clearTimeout(timer);
    routeTimers = [];
    pendingChapter = null;
    wipe.className = "scene-wipe";
    chapters.get("welcome").classList.remove("is-opening");
  }

  function after(milliseconds, callback) {
    routeTimers.push(window.setTimeout(callback, milliseconds));
  }

  function goTo(id) {
    if (!chapters.has(id) || id === activeScene?.id || pendingChapter) return;
    history.pushState(null, "", "#" + id);
    setChapterMenu(false);

    if (motion.matches) {
      activateChapter(id);
      return;
    }

    pendingChapter = id;
    if (activeScene.id === "welcome" && id === "view") {
      activeScene.classList.add("is-opening");
      after(590, () => burst($(".envelope-seal"), { count: 24, rising: true }));
      after(850, () => { wipe.className = "scene-wipe is-visible is-heart"; });
      after(1900, () => activateChapter(id));
      after(3740, clearTransition);
    } else {
      wipe.className = "scene-wipe is-visible is-" + (chapterWipes[id] || "cloud");
      after(448, () => activateChapter(id));
      after(930, clearTransition);
    }
  }

  function chapterFromURL() {
    const id = location.hash.slice(1);
    return chapters.has(id) ? id : "welcome";
  }

  function syncWithHistory() {
    clearTransition();
    activateChapter(chapterFromURL());
  }

  window.addEventListener("popstate", syncWithHistory);
  window.addEventListener("hashchange", syncWithHistory);
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-goto]");
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goTo(link.dataset.goto);
  });

  /* The handwritten letter keeps a complete readable copy under the animated ink. */
  const letter = $("#letter-body");
  const typingButton = $("#typing-toggle");
  const letterLines = all("[data-type]", letter).map((paragraph) => {
    const full = document.createElement("span");
    const ink = document.createElement("span");
    full.className = "type-full";
    full.textContent = paragraph.textContent;
    ink.className = "type-drawn";
    ink.setAttribute("aria-hidden", "true");
    paragraph.replaceChildren(full, ink);
    return { text: full.textContent, ink };
  });
  let letterFrame = 0;
  let letterWasPlayed = false;

  function finishLetter() {
    if (!letterWasPlayed) return;
    cancelAnimationFrame(letterFrame);
    letter.classList.remove("is-typing");
    typingButton.textContent = "Replay the handwriting";
    for (const line of letterLines) line.ink.classList.remove("type-current");
  }

  function startLetter() {
    if (motion.matches || activeScene?.id !== "letters" || letter.classList.contains("is-typing")) return;
    letterWasPlayed = true;
    typingButton.hidden = false;
    typingButton.textContent = "Read the whole letter";
    letter.classList.add("is-typing");
    for (const line of letterLines) line.ink.textContent = "";

    let paragraphIndex = 0;
    let start = performance.now() + 130;

    function write(now) {
      const line = letterLines[paragraphIndex];
      if (now >= start) {
        const lettersPerSecond = paragraphIndex === 0 ? 42 : 61;
        const length = Math.min(line.text.length, Math.floor((now - start) * lettersPerSecond / 1000));
        line.ink.classList.add("type-current");
        if (line.ink.textContent.length !== length) line.ink.textContent = line.text.slice(0, length);
        if (length === line.text.length) {
          line.ink.classList.remove("type-current");
          paragraphIndex += 1;
          if (paragraphIndex === letterLines.length) {
            finishLetter();
            return;
          }
          start = now + 370;
        }
      }
      letterFrame = requestAnimationFrame(write);
    }
    letterFrame = requestAnimationFrame(write);
  }

  typingButton.addEventListener("click", () => {
    if (letter.classList.contains("is-typing")) finishLetter();
    else startLetter();
  });

  $("#letter-flower").addEventListener("click", (event) => {
    const flower = event.currentTarget;
    const blooming = flower.getAttribute("aria-pressed") === "true";
    flower.setAttribute("aria-pressed", String(!blooming));
    $("#flower-note").textContent = blooming
      ? "Touch the blue flower."
      : "A little blue flower for the woman who makes me want to grow.";
  });

  /* Optional personal media is requested only as it is needed. */
  function mediaExists(path) {
    if (location.protocol === "file:") return Promise.resolve(true);
    if (!mediaChecks.has(path)) {
      const check = fetch(path, { method: "HEAD", cache: "no-store" })
        .then((response) => response.ok && !response.headers.get("content-type")?.includes("text/html"))
        .catch(() => false);
      mediaChecks.set(path, check);
    }
    return mediaChecks.get(path);
  }

  const photoDialog = $("#photo-dialog");
  const photoImage = $("#lightbox-image");
  const photoEmpty = $("#lightbox-empty");
  const photoButtons = all("[data-photo]");
  let shownPhoto = 0;
  let galleryStarted = false;

  function loadPhotos() {
    if (galleryStarted) return;
    galleryStarted = true;
    for (const [index, photo] of photos.entries()) {
      const image = $("img", photoButtons[index]);
      image.addEventListener("load", () => {
        photo.loaded = true;
        image.hidden = false;
        $(".memory-window", photoButtons[index]).classList.add("has-image");
        if (photoDialog.open && shownPhoto === index) showPhoto(index);
      }, { once: true });

      mediaExists(photo.path).then((exists) => {
        if (exists) image.src = photo.path;
      });
    }
  }

  function showPhoto(index) {
    shownPhoto = index;
    const photo = photos[index];
    const figure = $("#lightbox-figure");
    $("#photo-number").textContent = pad(index + 1) + " / " + pad(photos.length);
    $("#photo-title").textContent = photo.title;
    $("#photo-caption").textContent = photo.caption;
    photoImage.hidden = !photo.loaded;
    photoEmpty.hidden = Boolean(photo.loaded);
    if (photo.loaded) {
      photoImage.alt = $("img", photoButtons[index]).alt;
      photoImage.src = photo.path;
    }
    if (!motion.matches) {
      figure.classList.remove("is-changing");
      requestAnimationFrame(() => figure.classList.add("is-changing"));
    }
  }

  function stepPhoto(direction) {
    showPhoto((shownPhoto + direction + photos.length) % photos.length);
  }

  for (const button of photoButtons) {
    button.addEventListener("click", () => {
      showPhoto(Number(button.dataset.photo));
      photoDialog.showModal();
    });
  }

  for (const button of all("[data-photo-step]")) {
    button.addEventListener("click", () => stepPhoto(Number(button.dataset.photoStep)));
  }

  photoDialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      stepPhoto(event.key === "ArrowLeft" ? -1 : 1);
    }
  });

  const film = $("#our-film");
  const filmCover = $("#film-cover");
  const filmButton = $("#film-play");
  const filmStatus = $("#film-status");
  let filmAvailable;

  function checkFilm() {
    mediaExists(filmPath).then((exists) => {
      filmAvailable = exists;
      if (!exists) filmStatus.textContent = "This film is waiting for our-moment.mp4.";
    });
  }

  function showFilmFallback(message) {
    film.hidden = true;
    filmCover.hidden = false;
    filmStatus.textContent = message;
    if (activeScene?.id === "moment") filmButton.focus({ preventScroll: true });
  }

  filmButton.addEventListener("click", () => {
    if (filmAvailable === false) {
      showFilmFallback("Add our-moment.mp4 to the videos folder, then refresh to watch.");
      return;
    }
    if (!film.getAttribute("src")) film.src = filmPath;
    filmStatus.textContent = "";
    film.hidden = false;
    filmCover.hidden = true;
    film.focus({ preventScroll: true });
    film.play().catch((error) => {
      if (error.name !== "AbortError" && !film.error) {
        filmStatus.textContent = "Press play on the video controls to try again.";
      }
    });
  });

  film.addEventListener("error", () => {
    showFilmFallback("The film couldn’t open. Check that our-moment.mp4 is a playable MP4 file.");
  });

  /* The soundtrack has one media element for the whole story. */
  const song = $("#our-song");
  const soundtrack = $("#soundtrack");
  const songButton = $("#song-play");
  const soundToggle = $("#sound-toggle");
  const soundPanel = $("#sound-panel");
  const songStatus = $("#song-status");
  const position = $("#song-position");
  const volume = $("#song-volume");
  let songAvailable;
  let songStarting = false;
  let soundContext;
  let soundGain;

  function checkSong() {
    mediaExists(songPath).then((exists) => {
      songAvailable = exists;
      if (!exists) songStatus.textContent = "This sky is waiting for our-song.mp3.";
    });
  }

  function setSoundPanel(open) {
    soundToggle.setAttribute("aria-expanded", String(open));
    soundPanel.hidden = !open;
    if (open && songAvailable === undefined && !song.getAttribute("src")) checkSong();
  }

  function timeLabel(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const total = Math.max(0, Math.floor(seconds));
    return Math.floor(total / 60) + ":" + pad(total % 60);
  }

  function updateSongTime() {
    const seekable = Number.isFinite(song.duration) && song.duration > 0;
    position.disabled = !seekable;
    position.max = seekable ? song.duration : 1;
    position.value = seekable ? song.currentTime : 0;
    position.setAttribute("aria-valuetext", timeLabel(song.currentTime) + " of " + timeLabel(song.duration));
    $("#song-elapsed").textContent = timeLabel(song.currentTime);
    $("#song-duration").textContent = timeLabel(song.duration);
  }

  function updateSongPlayback() {
    const playing = !song.paused && !song.ended;
    soundtrack.classList.toggle("is-playing", playing);
    songButton.setAttribute("aria-label", playing ? "Pause our song" : "Play our song");
    $("use", songButton).setAttribute("href", playing ? "#i-pause" : "#i-play");
  }

  function setSongVolume(value, allowAudioContext = false) {
    song.volume = value;
    song.muted = value === 0;

    // Browsers that leave element volume fixed may still support Web Audio gain.
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (allowAudioContext && !soundGain && Math.abs(song.volume - value) > .01 && AudioContextClass) {
      try {
        soundContext = new AudioContextClass();
        soundGain = soundContext.createGain();
        const source = soundContext.createMediaElementSource(song);
        source.connect(soundGain);
        soundGain.connect(soundContext.destination);
      } catch {
        soundGain = null;
      }
    }
    if (soundGain) {
      soundGain.gain.value = value;
      if (allowAudioContext) soundContext.resume().catch(() => {});
    }
  }

  setSongVolume(Number(volume.value));
  soundToggle.addEventListener("click", () => setSoundPanel(soundPanel.hidden));
  soundtrack.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !soundPanel.hidden) {
      setSoundPanel(false);
      soundToggle.focus();
    }
  });
  volume.addEventListener("input", () => setSongVolume(Number(volume.value), true));
  position.addEventListener("input", () => { song.currentTime = Number(position.value); });

  songButton.addEventListener("click", () => {
    if (songStarting || !song.paused) {
      song.pause();
      songStarting = false;
      return;
    }
    if (songAvailable === false) {
      setSoundPanel(true);
      songStatus.textContent = "Add our-song.mp3 to the music folder, then refresh to listen.";
      return;
    }

    songStatus.textContent = "";
    songStarting = true;
    setSongVolume(Number(volume.value), true);
    if (!song.getAttribute("src") || song.error) song.src = songPath;
    song.play().catch((error) => {
      if (error.name === "AbortError") return;
      setSoundPanel(true);
      songStatus.textContent = song.error
        ? "The song couldn’t open. Check that our-song.mp3 is in the music folder."
        : "Tap play again to start the song.";
    }).finally(() => { songStarting = false; });
  });

  for (const name of ["loadedmetadata", "durationchange", "timeupdate", "emptied"]) {
    song.addEventListener(name, updateSongTime);
  }
  for (const name of ["play", "playing", "pause", "ended", "error"]) {
    song.addEventListener(name, updateSongPlayback);
  }

  /* A cloud, a star, a tiny heart, and one last note at dawn. */
  const noteDialog = $("#note-dialog");
  for (const button of all("[data-note]")) {
    button.addEventListener("click", () => {
      const kind = button.dataset.note;
      const note = notes[kind];
      noteDialog.dataset.noteKind = kind;
      $(".note-icon use", noteDialog).setAttribute("href", "#" + note.icon);
      $("#note-label").textContent = note.label;
      $("#note-title").textContent = note.title;
      $("#note-text").textContent = note.text;
      noteDialog.showModal();
    });
  }

  noteDialog.addEventListener("click", (event) => {
    if (event.target !== noteDialog) return;
    const rect = noteDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) noteDialog.close();
  });

  $("#view-heart").addEventListener("click", (event) => {
    burst(event.currentTarget, { count: 22 });
    if (!motion.matches) {
      event.currentTarget.animate(
        [{ scale: 1 }, { scale: 1.09 }, { scale: 1 }],
        { duration: 500, easing: "ease-out" }
      );
    }
  });

  const promiseButtons = all("[data-promise]");
  const foundPromises = new Set();
  for (const button of promiseButtons) {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.promise);
      foundPromises.add(index);
      for (const star of promiseButtons) star.setAttribute("aria-pressed", String(star === button));
      button.classList.add("is-found");

      $("#promise-index").textContent = "Promise " + pad(index + 1);
      $("#promise-text").textContent = promises[index];
      $("#promise-count").textContent = foundPromises.size === promises.length
        ? "05 / 05 · Every promise found"
        : pad(foundPromises.size) + " / 05 discovered";

      if (!motion.matches) {
        const reading = $("#promise-reading");
        reading.classList.remove("is-updating");
        requestAnimationFrame(() => reading.classList.add("is-updating"));
        burst(button, { count: 6, rising: true });
      }
    });
  }

  /* The sunrise opens a final heart, then lets the sky fill the screen. */
  const ending = $("#ending-dialog");
  const endHeart = $("#ending-heart");
  const endMessage = $("#ending-message");
  const endParticles = $("#ending-particles");
  let endTimer = 0;

  function showEndMessage() {
    endHeart.hidden = true;
    endMessage.hidden = false;
    $("button", endMessage).focus({ preventScroll: true });
  }

  function unfoldEnding() {
    if (!ending.open || ending.classList.contains("is-unfolding")) return;
    clearTimeout(endTimer);
    ending.classList.add("is-unfolding");
    if (motion.matches) {
      showEndMessage();
    } else {
      burst(endHeart, { count: 35, layer: endParticles });
      endTimer = window.setTimeout(showEndMessage, 1230);
    }
  }

  $("#keep-sky").addEventListener("click", () => {
    ending.classList.remove("is-unfolding");
    endMessage.hidden = true;
    endHeart.hidden = false;
    ending.showModal();
    if (motion.matches) unfoldEnding();
    else endTimer = window.setTimeout(unfoldEnding, 1460);
  });

  endHeart.addEventListener("click", unfoldEnding);
  ending.addEventListener("close", () => {
    clearTimeout(endTimer);
    endParticles.replaceChildren();
  });

  for (const button of all("[data-close]")) {
    button.addEventListener("click", () => button.closest("dialog").close());
  }

  motion.addEventListener("change", () => {
    moveVectors(activeScene, false);
    if (motion.matches) {
      finishLetter();
      typingButton.hidden = true;
      if (activeScene) all(".scroll-target", activeScene).forEach((target) => target.classList.add("is-in-view"));
      if (pendingChapter) syncWithHistory();
      if (ending.open) {
        clearTimeout(endTimer);
        ending.classList.add("is-unfolding");
        showEndMessage();
      }
    } else {
      moveVectors(activeScene, true);
      if (letterWasPlayed) typingButton.hidden = false;
      else if (activeScene?.id === "letters") startLetter();
    }
  });

  buildAtmosphere();
  activateChapter(chapterFromURL(), false);
})();
