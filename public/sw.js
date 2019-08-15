

var filesToCache = [
    '/',
    '/javascripts/webrtc.js',
    '/javascripts/new-age.js',
    '/javascripts/new-age.min.js',
    '/stylesheets/css/new-age.css',
    '/stylesheets/css/new-age.min.css',
    'https://fonts.googleapis.com/css?family=Lato',
    'https://fonts.googleapis.com/css?family=Catamaran:100,200,300,400,500,600,700,800,900',
    'https://fonts.googleapis.com/css?family=Muli',

'../views/index.pug',
'../views/chatroom.pug',
'../views/signin.pug'
];

self.addEventListener('install', function(event){
    console.log('SW Installed');
    event.waitUntil(
    caches.open('static')
    .then(function(cache){
        console.log('[ServiceWorker] Pre-caching files');
        console.log(cache)
        cache.addAll(filesToCache);
    }).catch(function(err){
        console.log('Error:' + err)
    }
    ))
});

self.addEventListener('activate', function(){
    console.log('SW Activated');
})

self.addEventListener('fetch', function(event){

    //respond with cached resources if available to match req
    event.respondWith(
        caches.match(event.request)
        .then(function(res){
           if(res){
               return res;
           }else{
               //if files not in cache fetch from network
               return fetch(event.request);
           }
        })
    )
})
