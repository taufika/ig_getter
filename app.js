// require
const express = require('express');
const app = express();
const request = require('request');
const port = 9998;
const officialAccs = require('./data/official.acc');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

// static res
app.use('/semantic', express.static('semantic'));
app.use('/data', express.static('data'));

app.get('/', (req, resp) => {
  // resp.render('component/top.html');
  resp.render('template_home.html');
  // resp.render('component/bottom.html');
});

app.get('/random', (req, resp) => {
  // resp.send(officialAccs);
  let imgData = [];

  const protocol = req.protocol;
  const hostname = req.hostname

  let promises = officialAccs.map(acc => {
    const reqUrl = `${protocol}://${hostname}:${port}/fetch/${acc.ig_name}`;

    return reqPromise(reqUrl).then(body => {
      return JSON.parse(body);
    });
  });

  Promise.all(promises).then(data => {
    const mergedData = shuffleArray([].concat(...data));
    
    // resp.send(mergedData);
    resp.render('template_listing.html', {data: mergedData, nama: 'Random'});
  });
});

// mini internal api for fetching
app.get('/fetch/:ig_name', (req, resp) => {
  const ig_name = req.params.ig_name

  // request to instagram
  const reqUrl = `https://www.instagram.com/${ig_name}`;
  console.info(`Fetching for ${reqUrl}`);
  request.get(reqUrl, (error, response, body) => {
    const jsonText = body.match(/<script type="text\/javascript">window\._sharedData = (.*)<\/script>/)[1].slice(0, -1);
    const fullName = JSON.parse(jsonText).entry_data.ProfilePage[0].graphql.user.full_name;
    const mediaData = JSON.parse(jsonText).entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;
    
    let imgData = [];
    mediaData.forEach(entry => {
      const image = entry.node.display_url;
      imgData.push({'name':fullName, 'image': {'url': image}});
    })
    resp.send(imgData);
  })
});

// page for specific user
app.get('/find', (req, resp) => {
  const { q } = req.query;
  if (!q || !q.length) {
    resp.redirect('/random');
    return;
  }

  const protocol = req.protocol;
  const hostname = req.hostname;
  const reqUrl = `${protocol}://${hostname}:${port}/fetch/${q}`;

  reqPromise(reqUrl).then(body => {
    const parsedBody = JSON.parse(body);
    resp.render('template_listing.html', {data: parsedBody, nama: parsedBody[0].name});
  });
});

// mini internal api for username publicity testing
app.get('/test/:ig_name', (req, resp) => {
  const ig_name = req.params.ig_name;

  const reqUrl = `https://www.instagram.com/${ig_name}`;
  request.get(reqUrl, (error, response, body) => {
    const mediaExist = body.length > 1;
    resp.send(mediaExist);
  });
});

app.listen(port, () => {
  console.log('App is starting');
  console.log(`Listening on ${port}`);
}).on('UncaughtException', err => {
  console.log(err);
});

// make promise from request
function reqPromise(reqUrl) {
  return new Promise((resolve, reject) => {
    request.get(reqUrl, (error, response, body) => {
      resolve(body);
    });
  });
}

// function to shuffle array
function shuffleArray(array) {
  for(let i = array.length-1; i>0; i--) {
    let j = Math.floor(Math.random() * (i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
