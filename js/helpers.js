'use strict';
//greatest common denominator
function gcd(a,b){
  var t,b,a
  while(b != 0){
    t = b;
    b = a%b
    a=t
  }
  return a;
}
//least common multiplier
function lcm(a,b){
  return a*b/gcd(a,b)
}

//SEEDED RANDOMS. Stolen somewhere
// Establish the parameters of the generator
var m = 25;
// a - 1 should be divisible by m's prime factors
var a = 11;
// c and m should be co-prime
var c = 17;
var rand = function() {
  // define the recurrence relationship
  seed = (a * seed + c) % m;
  // return an integer
  // Could return a float in (0, 1) by dividing by m
  return seed/m;
};

function getRandomFloat(a,b){
  return rand()*(b-a) +a
}
function getRandomInt(a,b){
  return Math.floor(rand()*(b - a + 1)) + a;
}
function pickRandomArray(arr) {
    return arr[arr.length * rand() << 0 ];
}

Array.prototype.shuffle = function() {
  var i = this.length, j, temp;
  if ( i == 0 ) return this;
  while ( --i ) {
     j = Math.floor( getRandomFloat(0,1) * ( i + 1 ) );
     temp = this[i];
     this[i] = this[j];
     this[j] = temp;
  }
  return this;
}
function repeatArray(arr, count) {
  var result = new Array();
  for(var i=0; i<count; i++) {
    result = result.concat(arr)
  }  
  return result;    
}
function drawArray(arr){
  var result = ''
  arr.forEach(function(a){
    result+=a
  })
  return result
}

function getDensity(limb){
  if(limb == 'rightFoot')
    return density*rFootDensityFactor
  else if (limb == 'leftFoot')
    return density*lFootDensityFactor
  else if (limb == 'rightHand')
    return density*rHandDensityFactor
  else if (limb == 'leftHand')
    return density*lHandDensityFactor
}
function getLength(limb){
  if(limb == 'rightFoot')
    return rFootLength
  else if (limb == 'leftFoot')
    return lFootLength
  else if (limb == 'rightHand')
    return rHandLength
  else if (limb == 'leftHand')
    return lHandLength
}
function getInstrument(limb){
  var result = []
  if(limb == 'rightFoot')
    result =  ['kick']
  else if (limb == 'leftFoot')
    result =  ['footHiHat']
  else if (limb == 'rightHand')
    result =  ['ride','snare', 'opHiHat','highTom', 'medTom', 'floorTom']
  else if (limb == 'leftHand')
    result =  ['snare','opHiHat','highTom']
  return orchestrate? result : [result[0]]
}
function getBuffer(instr){
  if(instr == 'kick')
    return kickSound.buffer
  else if (instr == 'snare')
    return snareSound.buffer
  else if (instr == 'clHiHat')
    return clHiHatSound.buffer
  else if (instr == 'opHiHat')
    return opHiHatSound.buffer
  else if (instr == 'footHiHat')
    return clHiHatSound.buffer
  else if (instr == 'metronome')
    return metronomeSound.buffer
  else if (instr == 'highTom')
    return highTomSound.buffer
  else if (instr == 'medTom')
    return medTomSound.buffer
  else if (instr == 'floorTom')
    return floorTomSound.buffer
  else if (instr == 'ride')
    return rideSound.buffer
}
function getGain(instr){
  if(instr == 'kick')
    return kickGain
  else if (instr == 'snare')
    return snareGain
  else if (instr == 'clHiHat')
    return clHiHatGain
  else if (instr == 'opHiHat')
    return opHiHatGain
  else if (instr == 'footHiHat')
    return clHiHatGain
  else if (instr == 'metronome')
    return metronomeGain
  else if (instr == 'highTom')
    return highTomGain
  else if (instr == 'medTom')
    return medTomGain
  else if (instr == 'floorTom')
    return floorTomGain
  else if (instr == 'ride')
    return rideGain
}
function isFla(limb,c){
  return limb == 'rightHand' && (commandList[1].sequenceRepeated[c] == commandList[2].sequenceRepeated[c])
}
//Thx Tomáš Kratochvíla @ http://stackoverflow.com/questions/38323525/minimum-least-common-multiplier-for-random-combinations
function minPossibleLength(knownLength, lengthsSize) {  
  var lengths = []    
  var min = 27720; // Maximum for bound range [2..11]
  if (lengthsSize == 1)
    return knownLength;
  lengths[0] = knownLength;
  for(var i = minStep; i<=maxStep; i++) {
    if (i != knownLength) {
      lengths[1] = i;
      if (lengthsSize == 2) {
          lengths[2] = i;
          lengths[3] = i;
          if (getLoopLength(lengths) < min) {
            min = getLoopLength(lengths);
            //console.log('lcm(['+knownLength+', '+i+']) = '+min); 
          }
        }
      else
      for(var j = minStep+1; j<=maxStep; j++) {
        if (i != j && j!= knownLength) {
          lengths[2] = j;
        if (lengthsSize == 3) {
          lengths[3] = j;
          if (getLoopLength(lengths) < min) {
            min = getLoopLength(lengths);
            //console.log('lcm(['+knownLength+', '+i+', '+j+']) = '+min); 
          }
        }
      else
          for(var k = minStep+2; k<=maxStep; k++) {
            if (i != k && j != k && k!= knownLength) {
              lengths[3] = k;
              if (getLoopLength(lengths) < min) {
                min = getLoopLength(lengths);
                //console.log('lcm(['+knownLength+', '+i+', '+j+', '+k+']) = '+min); 
              }
            }
          }
        }
      }
    }
  }
  return min;
}


//classic webaudio api loader.Not my code
function loadSamples(){
  bufferLoader = new BufferLoader(
    context,
    [
      'sounds/Bass-Drum-1.wav',
      'sounds/Snare-Drum-1.wav',
      'sounds/Closed-Hi-Hat-1.wav',
      'sounds/4d.wav',
      'sounds/Open-Hi-Hat-1.wav',
      'sounds/Ride-Cymbal-2.wav',
      'sounds/Hi-Tom-1.wav',
      'sounds/Mid-Tom-1.wav',
      'sounds/Floor-Tom-1.wav',
    ],
    finishedLoading
    );
  bufferLoader.load();
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











