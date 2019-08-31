//register service worker

var console = {};
console.log = function() {};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("../sw.js").then(function() {
    console.log("SW registered");
  });
}
