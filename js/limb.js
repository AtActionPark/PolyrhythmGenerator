function Limb(type){
	this.type = type
	this.gain = context.createGain();
	this.gain.connect(context.destination);
}



Limb.prototype.play = function(type,c, time){
	this.source = context.createBufferSource();
	this.source.connect(this.gain);

	if(type == 'kick'){
  		this.source.buffer = kickSound.buffer;
	}
	else if(type == 'snare'){
  		this.source.buffer = snareSound.buffer;
  		this.gain.gain.value = 0.7
	}
	else if(type == 'clhiHat'){
  		this.source.buffer = clHiHatSound.buffer;
	}
  else if(type == 'opHiHat'){
    if(commandList[3].sequenceRepeated[c] == 'footHiHat')
      this.source.buffer = clHiHatSound.buffer;
    else
      this.source.buffer = opHiHatSound.buffer;
  }
	else if(type == 'metronome'){
  		this.source.buffer = metronomeSound.buffer;
      this.gain.gain.value = 0.7
	}
  else if(type == 'ride'){
      this.source.buffer = rideSound.buffer;
      this.gain.gain.value = 0.7
  }
  else if(type == 'footHiHat'){
      this.source.buffer = clHiHatSound.buffer;
  }
  else if(type == 'highTom'){
      this.source.buffer = highTomSound.buffer;
  }
  else if(type == 'medTom'){
      this.source.buffer = medTomSound.buffer;
  }
  else if(type == 'floorTom'){
      this.source.buffer = floorTomSound.buffer;
  }
  	
  this.source.start(time);
}


function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url, index) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      },
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
  }

  request.send();
}

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
}

var kickSound = null;
var snareSound = null;
var clHiHatSound = null;
var opHiHatSound = null;
var metronomeSound = null;

function finishedLoading(bufferList) {
  kickSound = context.createBufferSource();
  kickSound.buffer = bufferList[0];

  snareSound = context.createBufferSource();
  snareSound.buffer = bufferList[1];

  clHiHatSound = context.createBufferSource();
  clHiHatSound.buffer = bufferList[2];

  metronomeSound = context.createBufferSource();
  metronomeSound.buffer = bufferList[3];

  opHiHatSound = context.createBufferSource();
  opHiHatSound.buffer = bufferList[4];

  rideSound = context.createBufferSource();
  rideSound.buffer = bufferList[5];

  highTomSound = context.createBufferSource();
  highTomSound.buffer = bufferList[6];

  medTomSound = context.createBufferSource();
  medTomSound.buffer = bufferList[7];

  floorTomSound = context.createBufferSource();
  floorTomSound.buffer = bufferList[8];
}











