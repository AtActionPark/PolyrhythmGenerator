'use strict';
//cd c://program files (x86)/google/chrome/application chrome --allow-file-access-from-files

//SEEDS
//60-4-72-50-20-0-0-58.67931 simple 5 over 4
//60-5-72-50-100-1-1-22.28552 cool hard 5/4
//80-3-72-50-50-1-1-58.82948 cool 3/4


// Parameters
var tempo = 60.0;
//nb of steps per bar
var baseResolution = 4;
//proba of having a beat on each step
var density = 0.5;
//limit for the result length in steps
var maxLength = 64;
var useLeftFoot = true;
var orchestrate = true;
//0-1, linear. Used to calculate length and organisation of sequences 
var complexity = 0.5;
//complexity translated to 0-100, with squared increment
var difficulty;

// sequences length
var minStep = 4;
var maxStep = 11;

var flaTime = 0.04

//limb bias
var lHandDensityFactor = 0.7;
var rHandDensityFactor = 1;
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
var resolution;
var context;
var bufferLoader;
var empty = '-'
var metronomeMute = true
var seedPrecision = 5;
var generationSeed;
var seed;

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
var metronomeTomGain = 0.7


$(document).ready(function(){
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext
  context.suspend()

  //async loading of all samples
  loadSamples()

  //listeners for params buttons
  var complex = $('#complexity')[0]
  complex.addEventListener("input", function() {
      $('#complexityResult').html(complex.value)
  }, false); 
  $('#leftFoot').change(function(){
    useLeftFoot = $(this).is(':checked')
  })
  $('#orchestrate').change(function(){
    orchestrate = $(this).is(':checked')
  })
})

//Concatenates all needed params for the seed
function generateSeed(){
  var s = parseInt(tempo) + '-' + parseInt(baseResolution) + '-' + parseInt(maxLength) + '-' + parseInt(density) + '-'+ parseInt(complexity*100) +  '-' + (useLeftFoot?1:0) + '-' + (orchestrate?1:0) + '-' +  generationSeed
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

//Reads the seed value input and generates a song according to it
function loadSeed(){
  var input = $('#seedInput').val().trim()
  var s =input.split(/-/g)

  tempo = parseInt(s[0]) || 60
  $('#tempo').val(tempo)

  baseResolution = parseInt(s[1]) ||4
  $('#resolution').val(baseResolution)

  maxLength = parseInt(s[2]) || 32
  $('#length').val(maxLength)

  density = parseInt(s[3]) || 0.5
  $('#density').val(density)


  complexity = parseInt(s[4])/100 || 0.5
  $('#complexity').val(parseInt(complexity*100))
  $('#complexityResult').html(parseInt(complexity*100))


  useLeftFoot = parseInt(s[5]) ==0? false: true|| false
  $('#leftFoot').prop('checked', useLeftFoot);

  orchestrate = parseInt(s[6]) ==0? false: true|| false
  $('#orchestrate').prop('checked', orchestrate);

  seed = parseFloat(s[7]) || 1
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
function getUserParams(){
   baseResolution = parseInt($('#resolution').val())
   resolution = baseResolution

   tempo = parseInt($('#tempo').val())

   maxLength = parseInt($('#maxLength').val())
   maxLength = Math.max(maxLength, resolution)

   density = parseInt($('#density').val())

   complexity = parseInt($('#complexity').val())/100
   difficulty = (1- (complexity-1)*(complexity-1))*100
}

//SCHEDULER
//Advances the cursor for reading sequences and update display
function nextNote(){
  var secondsPerBeat = 60.0 / tempo
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
function Limb(type){
  this.type = type
  this.instruments = getInstrument(type)
  this.gain = context.createGain();
  this.gain.connect(context.destination);
}
//To play a note we need the type (kick, snare...), as well as the cursor position. This is needed to check the left foot state if a hand hits the hihat, as well as flas
Limb.prototype.play = function(type,c){
  this.source = context.createBufferSource();
  this.source.connect(this.gain);
  var time = 0

  if(type == 'kick'){
    this.source.buffer = kickSound.buffer;
    this.gain.gain.value = kickGain
  }
  else if(type == 'snare'){
    this.source.buffer = snareSound.buffer;
    this.gain.gain.value = snareGain
    //fla
    if(this.type == 'rightHand' && commandList[1].sequenceRepeated[c] == 'snare')
      time = context.currentTime + flaTime;
  }
  else if(type == 'clhiHat'){
    this.source.buffer = clHiHatSound.buffer;
    this.gain.gain.value = clHiHatGain
    //fla
    if(this.type == 'rightHand' && commandList[1].sequenceRepeated[c] == 'clHiHat')
      time = context.currentTime + flaTime;
  }
  else if(type == 'opHiHat'){
    this.source.buffer = opHiHatSound.buffer;
    this.gain.gain.value = opHiHatGain
    //fla
    if(this.type == 'rightHand' && commandList[1].sequenceRepeated[c] == 'opHiHat')
      time = context.currentTime + flaTime;
  }
  else if(type == 'metronome'){
    this.source.buffer = metronomeSound.buffer;
    this.gain.gain.value = metronomeGain

  }
  else if(type == 'ride'){
    this.source.buffer = rideSound.buffer;
    this.gain.gain.value = rideGain
  }
  else if(type == 'footHiHat'){
    this.source.buffer = clHiHatSound.buffer;
    this.gain.gain.value = footHiHatGain
  }
  else if(type == 'highTom'){
    this.source.buffer = highTomSound.buffer;
    this.gain.gain.value = highTomGain
    //fla
    if(this.type == 'rightHand' && commandList[1].sequenceRepeated[c] == 'highTom')
      time = context.currentTime + flaTime;
  }
  else if(type == 'medTom'){
    this.source.buffer = medTomSound.buffer;
    this.gain.gain.value = medTomGain
  }
  else if(type == 'floorTom'){
    this.source.buffer = floorTomSound.buffer;
    this.gain.gain.value = floorTomGain
  }
    
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


//generates the length of the sequence for each limb. Depending on the complexity, all sequences' lengths could be the same or different
function generateLengths(){
  //start by making sure that the resolution is in the array of possible lengths
  var lengths = [baseResolution];

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
  if(getRandomFloat(0,100)<=(100-difficulty))
    lengths[1] = lengths[0]
  if(getRandomFloat(0,100)<=(100-difficulty))
    lengths[2] = lengths[1]
  if(getRandomFloat(0,100)<=(100-difficulty))
    lengths[3] = lengths[2]

  //shuffle the array 
  // if we only shuffle after the first element, we can make sure that the left foot
  // will get a sequence length = resolution, for an easier scenario
  if(getRandomFloat(0,100)<(1-complexity)*100){
    lengths = lengths.slice(1,4).shuffle()
    lengths.unshift(baseResolution)
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
  for(var i = 0;i<getLength(limb.type);i++){
    var instrument = pickRandomArray(limb.instruments)
    seq[i] = empty
    //randomly add notes
    if(getRandomFloat(0,1)*100<getDensity(limb.type)){
      seq[i] = instrument
      stepsAdded++
    }
    //extra chance to add note on sequence start
    if(i%length == 0 && getRandomFloat(0,1)*50<getDensity(limb.type)){
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

  //go through the sequence and check simultaneaous hand and foot hihat
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
  $('#loop').html('</br><div>Loops in <b>' + loops + '</b> ' + resolution +  '/4 bars' + remain + '</div>' ) 
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




















