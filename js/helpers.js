'use strict';

//SEEDED RANDOMS. Stolen somewhere
// Establish the parameters of the generator
const m = 25;
// a - 1 should be divisible by m's prime factors
const a = 11;
// c and m should be co-prime
const c = 17;
const rand = function() {
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
  let i = this.length, j, temp;
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
  let result = new Array();
  for(let i=0; i<count; i++) {
    result = result.concat(arr)
  }  
  return result;    
}
//greatest common denominator
function gcd(a,b){
  let t
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
  let result = []
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
function getColor(limb,fla){
  if(fla){
    return "purple";
  }
  if(limb == 'rightFoot')
    return '#333'
  else if (limb == 'leftFoot')
    return "gray"
  else if (limb == 'rightHand')
    return "red"
  else if (limb == 'leftHand')
    return "blue"
}
function getOppositeColor(limb){
  if (limb == 'rightHand')
    return "blue"
  else if (limb == 'leftHand')
    return "red"
}
function getHeight(note){
  if(note == 'kick')
    return 4.5*hSpace + hStartSpace
  else if (note == 'snare')
    return 2.5*hSpace + hStartSpace
  else if (note == 'clHiHat')
    return 0.5*hSpace + hStartSpace
  else if (note == 'opHiHat')
    return 0.5*hSpace + hStartSpace
  else if (note == 'footHiHat')
    return 5.5*hSpace + hStartSpace
  else if (note == 'highTom')
    return 1.5*hSpace + hStartSpace
  else if (note == 'medTom')
    return 2*hSpace + hStartSpace
  else if (note == 'floorTom')
    return 3.5*hSpace + hStartSpace
  else if (note == 'ride')
    return hSpace + hStartSpace
}

function isFla(limb,c){
  return limb == 'rightHand' && (commandList[1].sequenceRepeated[c] == commandList[2].sequenceRepeated[c])
}
//Thx Tomáš Kratochvíla @ http://stackoverflow.com/questions/38323525/minimum-least-common-multiplier-for-random-combinations
function minPossibleLength(knownLength, lengthsSize) {  
  let lengths = []    
  let min = 27720; // Maximum for bound range [2..11]
  if (lengthsSize == 1)
    return knownLength;
  lengths[0] = knownLength;
  for(let i = minStep; i<=maxStep; i++) {
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
      for(let j = minStep+1; j<=maxStep; j++) {
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
          for(let k = minStep+2; k<=maxStep; k++) {
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
  const request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  const loader = this;

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
  for (let i = 0; i < this.urlList.length; ++i)
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
function bjorklund(steps, pulses) {
  
  steps = Math.round(steps);
  pulses = Math.round(pulses);  

  if(pulses > steps || pulses == 0 || steps == 0) {
    return new Array();
  }

  let pattern = [];
  let counts = [];
  let remainders = [];
  let divisor = steps - pulses;
  remainders.push(pulses);
  let level = 0;

  while(true) {
    counts.push(Math.floor(divisor / remainders[level]));
    remainders.push(divisor % remainders[level]);
    divisor = remainders[level]; 
         level += 1;
    if (remainders[level] <= 1) {
      break;
    }
  }
  
  counts.push(divisor);

  let r = 0;
  const build = function(level) {
    r++;
    if (level > -1) {
      for (let i=0; i < counts[level]; i++) {
        build(level-1); 
      } 
      if (remainders[level] != 0) {
            build(level-2);
      }
    } else if (level == -1) {
             pattern.push(0); 
    } else if (level == -2) {
           pattern.push(1);        
    } 
  };

  build(level);
  return pattern.reverse();
}


function convertBase(value, from_base, to_base) {
  const range = '0123456789ab-cdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'.split('');
  const from_range = range.slice(0, from_base);
  const to_range = range.slice(0, to_base);
  
  let dec_value = value.split('').reverse().reduce(function (carry, digit, index) {
    if (from_range.indexOf(digit) === -1) throw new Error('Invalid digit `'+digit+'` for base '+from_base+'.');
    return carry += from_range.indexOf(digit) * (Math.pow(from_base, index));
  }, 0);
  
  let new_value = '';
  while (dec_value > 0) {
    new_value = to_range[dec_value % to_base] + new_value;
    dec_value = (dec_value - (dec_value % to_base)) / to_base;
  }
  return new_value || '0';
}











