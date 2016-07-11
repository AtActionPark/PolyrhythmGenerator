'use strict';

// USER PARAMS
//
var tempo = 60.0;
//nb of steps per bar
var resolution = 4;
//duration of notes
var subdivision = 4;
//proba of having a beat on each step
var densityCategory = 2;
//limit for the result length in steps
var maxLength = 64;
var useLeftFoot = true;
var orchestrate = true;
//0-1, linear. Used to calculate length and organisation of sequences 
var nbOfRhythms = 1;

// sequences length
var minStep = 4;
var maxStep = 11;

var flaTime = 0.04

//limb bias - some limbs will play a higher average nb of notes
var lHandDensityFactor = 0.7;
var rHandDensityFactor = 0.8;
var lFootDensityFactor = 0.5;
var rFootDensityFactor = 0.6;

//scheduler
var lookahead = 25.0;
var scheduleAheadTime = 0.1;
var schedulerTimer;
var nextNoteTime = 0.0;

//stuff
var commandList = []
var cursor = 0;
var max = 1;
var play = true;
var context;
var bufferLoader;
var empty = '-'
var metronomeMute = true
var seedPrecision = 5;
var generationSeed;
var seed;
var density;

var lHandLength = 0;
var rHandLength =0;
var lFootLength = 0;
var rFootLength = 0;

var kickSound = null;
var snareSound = null;
var clHiHatSound = null;
var opHiHatSound = null;
var metronomeSound = null;
var rideSound = null;
var highTomSound = null;
var medTomSound = null;
var floorTomSound = null;


var snareGain = 0.7
var kickGain = 1
var clHiHatGain = 1
var opHiHatGain = 1
var footHiHatGain = 1
var highTomGain = 1
var medTomGain = 1
var floorTomGain = 1
var rideGain = 0.7
var metronomeGain = 0.7


$(document).ready(function(){
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  context = new AudioContext
  context.suspend()

  //async loading of all samples
  loadSamples();
})

//Concatenates all needed params for the seed
function generateSeed(){
  var s = parseInt(tempo) + '-' + parseInt(resolution) + '-'+ parseInt(subdivision) + '-' + parseInt(maxLength) + '-' + parseInt(densityCategory) + '-'+ parseInt(nbOfRhythms) +  '-' + (useLeftFoot?1:0) + '-' + (orchestrate?1:0) + '-' +  generationSeed
  return s;
}
function generateSong(){
  generationSeed = Math.random()*100
  generationSeed = generationSeed.toFixed(seedPrecision)
  seed = generationSeed

  generateAndStart()
}
function generateAndStart(){
  reset()

  getUserParams()
  $('#seed').html(generateSeed(seed))

  var count = 0
  do {
    generateLengths()
    count++;
  } while((max > maxLength  && count <500) || max > 200)

  createDrumCommands()
  displayParams()
  drawTab()
  setInterval(scheduler, 20);
  play = true;
}
function getUserParams(){
  resolution = parseInt($('#resolution').val())
  subdivision = parseInt($('#subdivision').val())

  tempo = parseInt($('#tempo').val())

  maxLength = parseInt($('#maxLength').val())
  maxLength = Math.max(maxLength, resolution)

  densityCategory = parseInt($('#density').val())
  density = densityCategory*25

  nbOfRhythms = parseInt($("#nbOfRhythms").val());

  useLeftFoot = $("#leftFoot").is(':checked');
  orchestrate = $("#orchestrate").is(':checked');
}
function randomize(){
  generationSeed = Math.random()*100
  generationSeed = generationSeed.toFixed(seedPrecision)

  var t = getRandomInt(30,120);
  var res = getRandomInt(2,9);
  var sub = getRandomInt(2,8);
  var mxL = getRandomInt(20,120);
  var de = getRandomInt(0,4);
  var rh = getRandomInt(2,4);
  var lF = getRandomInt(0,1);
  var or = getRandomInt(0,1);
  var randomGenSeed = t + '-' + res+ '-' + sub+ '-' +mxL + '-' +de+ '-' + rh + '-'+lF+ '-' +or+ '-' +generationSeed

  loadSeed(randomGenSeed)
}

//Reads the seed value input 
function readSeed(){
  var input = $('#seedInput').val().trim() 
  loadSeed(input)
}
//generates a song according to the seed
function loadSeed(input){
  var s =input.split(/-/g)
  tempo = parseInt(s[0]) || 60
  $('#tempo').val(tempo)

  resolution = parseInt(s[1]) ||4
  $('#resolution').val(resolution)

  subdivision = parseInt(s[2]) ||4
  $('#subdivision').val(subdivision)

  maxLength = parseInt(s[3]) || 32
  $('#maxLength').val(maxLength)

  densityCategory = parseInt(s[4]) || 0.5
  $('#density').val(parseInt(densityCategory))
  density = densityCategory*25

  nbOfRhythms = parseInt(s[5]) || 2
  $('#nbOfRhythms').val(parseInt(nbOfRhythms))

  useLeftFoot = parseInt(s[6]) ==0? false: true|| false
  $('#leftFoot').prop('checked', useLeftFoot);

  orchestrate = parseInt(s[7]) ==0? false: true|| false
  $('#orchestrate').prop('checked', orchestrate);

  seed = parseFloat(s[8]) || 1

  generationSeed = seed
  
  $('#seed').html(generateSeed())
  
  generateAndStart();
}

function reset(){
  context.resume()
  clearInterval(schedulerTimer);
  cursor = 0;
  commandList = []
  generateLengths()
}


//SCHEDULER
//Advances the cursor for reading sequences and update display
function nextNote(){
  var secondsPerBeat = 60.0 / tempo *resolution/subdivision
  nextNoteTime +=secondsPerBeat/resolution;
  var c = cursor+1
  cursor++;

  $('#step').html('<b>Steps : </b>' + c + '/' + max )
  $('.sheetLine .step').css({"border-bottom-width":"0px"});
  $('.sheetLine .step:nth-child('+ (c+1) + ')' ).css({"border-bottom-color": "black", 
             "border-bottom-width":"1px", 
             "border-bottom-style":"solid"});

  if (cursor == max){
      cursor = 0;
  }
 }
//Look at the sequences and play all scheduled notes
function scheduler(){
  if(!play)
    return
  while(nextNoteTime < context.currentTime + scheduleAheadTime){
    commandList.forEach(function(c){
      c.play(cursor)
    })
    nextNote()
  }
}
function pause(){
  play = !play
  if(!play)
    context.suspend()
  else
    context.resume()
  $('#pause').html(play? 'pause':'play')
}


//LIMB
//This is needed because the output needs to be playable. It's not enough to randomize every piece of the drum set,
// we need to make sure that we have at most 4 hits at the same time, and that each limb has a set of associated instruments
function Limb(name){
  this.name = name
  this.instruments = getInstrument(name)
  this.gain = context.createGain();
  this.gain.connect(context.destination);
}
//To play a note we need the intrument played (kick, snare...), as well as the cursor position. This is needed to check for flas
Limb.prototype.play = function(instr,c){
  this.source = context.createBufferSource();
  this.source.connect(this.gain);
  this.source.buffer = getBuffer(instr);
  this.gain.gain.value = getGain(instr);

  var time = 0;
  if(isFla(this.name,c))
    time = context.currentTime + flaTime;
  
  this.source.start(time);
}

//COMMAND
//Command: stores limb + associated sequence of note
function Command(limb, sequence, name){
  this.limb  = limb;
  this.sequence = sequence;
  this.sequenceRepeated = [];
  this.name = name;
  this.mute = false;
}
//Play the note at the cursor position
Command.prototype.play = function(c){
  if(this.muted)
    return

  var limb = this.limb
  if(this.sequenceRepeated[c] != empty ){
    limb.play(this.sequenceRepeated[c],c)
  }
}
//Returns basic info/buttons for the sequence
Command.prototype.display = function(){
  var mute = '<input id=' + this.name + ' type=checkbox><label></label> '
  var length = ' : ' + this.sequence.length  + ' steps'
  var result = ''
  for(var i = 0;i<this.sequence.length;i++){
    result +=  this.sequence[i] + ' '
  }

  if(this.name == "Metronome")
    return  mute + '<div class="limbDiv" ><b>' + '<div class="inline '+ this.name + '">' + this.name + '</b></div></div></br></br>'
  return mute + '<div class="limbDiv" ><b>' + '<div class="inline '+ this.name + '">' + this.name + '</div>' + length + ' : ' + result +  '</b></div></br>'
}


//generates the length of the sequence for each limb. Depending on the nbOfRhythms, all sequences' lengths could be the same or different
function generateLengths(){
  //start by making sure that the resolution is in the array of possible lengths
  var lengths = [resolution];

  //continue populationg the array until we have 3 additional random values
  while(lengths.length<4){
    var randomnumber=getRandomInt(minStep,maxStep)
    var found=false;
    for(var i=0;i<lengths.length;i++){
      if(lengths[i]==randomnumber){
        found=true;break
      }
    }
    if(!found)
      lengths[lengths.length]=randomnumber;  
  }

  //depending on the difficulty, replace some of the length to be equal to some other
  if(nbOfRhythms == 1){
    lengths[1] = lengths[0];
    lengths[2] = lengths[1];
    lengths[3] = lengths[2];
  }
  else if(nbOfRhythms == 2){
    lengths[2] = lengths[1];
    lengths[3] = lengths[2];
  }
  else if(nbOfRhythms == 3){
    lengths[3] = lengths[2];
  }

  //shuffle the array 
  // if we only shuffle after the first element, we can make sure that the left foot
  // will get a sequence length = resolution, for an easier scenario
  if(getRandomFloat(0,100)<(1-nbOfRhythms)*100){
    lengths = lengths.slice(1,4).shuffle()
    lengths.unshift(resolution)
  }
  else
    lengths = lengths.shuffle()

  lFootLength = lengths[0]
  lHandLength = lengths[1]
  rHandLength = lengths[2]
  rFootLength = lengths[3]
  
  // compute the max number of steps of the song
  max = 1;
  for(var i = 0;i<lengths.length;i++)
    max = lcm(max,lengths[i])
}
//Generates sequence of notes based on random params and precalculated length
function randomSequence(limb){
  var seq = []
  var stepsAdded = 0

  //Initialize the sequence with all empty steps
  for(var i = 0;i<getLength(limb.name);i++){
    var instrument = pickRandomArray(limb.instruments)
    seq[i] = empty
    //randomly add notes
    if(getRandomFloat(0,1)*100<getDensity(limb.name)){
      seq[i] = instrument
      stepsAdded++
    }
    //extra chance to add note on sequence start
    if(i%length == 0 && getRandomFloat(0,1)*50<getDensity(limb.name)){
      seq[i] = instrument
      stepsAdded++
    }
  }
  //if empty, add one random step
  if(stepsAdded == 0)
    seq[getRandomInt(0,seq.length-1)] = instrument
  return seq
}
//Generate 1 random commands for each limb and adds them to the command list
function createDrumCommands(){
  commandList = []

  var metronome = new Limb('metronome') 
  var metronomeSequence = ['metronome']
  var metronomeCommand = new Command(metronome,metronomeSequence,'Metronome')
  metronomeCommand.muted = metronomeMute
  commandList.push(metronomeCommand)

  var leftHand = new Limb('leftHand') 
  var leftHandSeq = randomSequence(leftHand)
  var leftHandCommand = new Command(leftHand,leftHandSeq,'LeftHand')
  commandList.push(leftHandCommand)

  var rightHand = new Limb('rightHand') 
  var rightHandSeq = randomSequence(rightHand)
  var rightHandCommand = new Command(rightHand,rightHandSeq,'RightHand')
  commandList.push(rightHandCommand)

  var leftFoot = new Limb('leftFoot') 
  var leftFootSequence = randomSequence(leftFoot)
  var leftFootCommand = new Command(leftFoot,leftFootSequence,'LeftFoot')
  if(useLeftFoot)
    commandList.push(leftFootCommand)

  var rightFoot = new Limb('rightFoot') 
  var rightFootSequence = randomSequence(rightFoot)
  var rightFootCommand = new Command(rightFoot,rightFootSequence,'RightFoot')
  commandList.push(rightFootCommand)

  
  //repeat each sequence so that their total length is the max nb of steps
  commandList.forEach(function(c){
    var n = max/c.sequence.length
    c.sequenceRepeated = repeatArray(c.sequence,n)
  })

  //go through the sequence and check simultaneaous hand and foot hihat, and flas
  for(var c = 0;c<max;c++){
    if(commandList[3].sequenceRepeated[c] == 'footHiHat' ){
      if(commandList[1].sequenceRepeated[c] == 'opHiHat')
        commandList[1].sequenceRepeated[c] = 'clHiHat'
      if(commandList[2].sequenceRepeated[c] == 'opHiHat')
        commandList[2].sequenceRepeated[c] = 'clHiHat'
    }
  }
  

  //compute the nb of bars needed
  var loops = Math.floor(max/resolution)
  var remainder = max%resolution
  var remain = remainder == 0 ? '' : (' and ' + remainder + ' steps')
  $('#loop').html('</br><div>Loops in <b>' + loops + '</b> ' + resolution +  '/' + subdivision+ ' bars' + remain + '</div>' ) 
}

//DISPLAY
//Display characteristics of the random song and add a mute command
function displayParams(){
  $('#summary').empty()
  $('#pauseDiv').empty()
  $('#pauseDiv').append('<button id="pause" class="btn btn-default" onClick="pause()">Pause</button>')

  $('#limbs').empty()

  commandList.forEach(function(c){
    $('#limbs').append(c.display())
    //show mute icon
    if(c.muted)
      $('#' + c.name + '').prop('checked', false);
    else
       $('#' + c.name + '').prop('checked', true);
    //set mute/unmute
    $('#' + c.name + '').click(function(){
      var self = $(this)
      if(self.is(':checked')){
        c.muted = false
        if(c.name == 'Metronome')
          metronomeMute = false
        $('.'+ c.name +'').removeClass('muted')
      }
      else{
        c.muted = true
        if(c.name == 'Metronome')
          metronomeMute = true
        $('.'+ c.name +'').addClass('muted')
      }
    })
  })
}

function drawTab(){
  var result = ''
  var emptyDiv = '<div class="step">' + empty + '</div>'

  var kickLine = new Array(max).fill(emptyDiv);
  var snareLine = new Array(max).fill(emptyDiv);
  var highTomLine = new Array(max).fill(emptyDiv);
  var medTomLine = new Array(max).fill(emptyDiv);
  var floorTomLine = new Array(max).fill(emptyDiv);
  var hiHatLine = new Array(max).fill(emptyDiv);
  var rideLine = new Array(max).fill(emptyDiv);
  var footHiHatLine = new Array(max).fill(emptyDiv);

  var noteSymbol = '\u25CF';
  var opHiHatSymbol = '\u2297';
  var clHiHatSymbol = 'x';
  var rideSymbol = 'X';

  //go through each command, check what is played, and build the instrument lines. 
  // special cases for flas
  commandList.forEach(function(c){
    for(var i = 0;i<c.sequenceRepeated.length;i++){
      if(c.sequenceRepeated[i] == 'highTom')
        if(highTomLine[i] == emptyDiv)
          highTomLine[i] = '<div class="step ' + c.name+ '">' + noteSymbol + '</div>'
        else
          highTomLine[i] ='<div class="step fla">' + noteSymbol + '</div>'

      else if(c.sequenceRepeated[i] == 'medTom')
        if(medTomLine[i] == emptyDiv)
          medTomLine[i] = '<div class="step ' + c.name+ '">' + noteSymbol + '</div>'
        else
          medTomLine[i] ='<div class="step fla">' + noteSymbol + '</div>'

      else if(c.sequenceRepeated[i] == 'snare')
        if(snareLine[i] == emptyDiv)
          snareLine[i] = '<div class="step ' + c.name+ '">' + noteSymbol + '</div>'
        else
          snareLine[i] ='<div class="step fla">' + noteSymbol + '</div>'

      else if(c.sequenceRepeated[i] == 'opHiHat')
        if(hiHatLine[i] == emptyDiv)
          hiHatLine[i] = '<div class="step ' + c.name+ '">' + opHiHatSymbol + '</div>'
        else
          hiHatLine[i] = '<div class="step fla">' + opHiHatSymbol + '</div>'

      else if(c.sequenceRepeated[i] == 'clHiHat')
        if(hiHatLine[i] == emptyDiv)
          hiHatLine[i] = '<div class="step ' + c.name+ '">' + clHiHatSymbol + '</div>'
        else
          hiHatLine[i] = '<div class="step fla">' + clHiHatSymbol + '</div>'

      else if(c.sequenceRepeated[i] == 'floorTom')
        floorTomLine[i] = '<div class="step ' + c.name+ '">' + noteSymbol + '</div>'

      else if(c.sequenceRepeated[i] == 'kick')
        kickLine[i] = '<div class="step ' + c.name+ '">' + noteSymbol + '</div>'


      else if(c.sequenceRepeated[i] == 'ride')
        rideLine[i] = '<div class="step ' + c.name+ '">' + rideSymbol + '</div>'

      else if(c.sequenceRepeated[i] == 'footHiHat')
        footHiHatLine[i] = '<div class="step ' + c.name+ '">' + clHiHatSymbol + '</div>'
    }
  })

  
  result += '<div class="sheetLine"><div class="instrLabel"><b>Ride</b></div>' + drawArray(rideLine) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>HiHat</b></div>' + drawArray(hiHatLine) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>highTom</b></div>' + drawArray(highTomLine) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>medTom</b></div>' + drawArray(medTomLine) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>Snare</b></div>' + drawArray(snareLine) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>floorTom</b></div>' + drawArray(floorTomLine) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>Kick</b></div>' + drawArray(kickLine) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>FootHiHat</b></div>' + drawArray(footHiHatLine) + '</div></br>'

  $('#sheet').html(result)

  for(var i = 1;i<max;i+=resolution){
    $('.sheetLine .step:nth-child('+ i + ')' ).css({"border-right-width":"1px", "border-right-style":"solid"});
  }
  $('.sheetLine .step' ).css({"border-bottom-color": "black", "border-bottom-width":"0px", "border-bottom-style":"solid"});
}




















