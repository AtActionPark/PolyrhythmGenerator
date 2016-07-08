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
var commandList = [];
var cursor = 0;
var max = 1;
var play = true;
var resolution;
var context;
var bufferLoader;
var ctx;

var empty = '-'
var metronomeMute = true
var seedPrecision = 5;
var generationSeed;
var seed;

var lHandLength = 0;
var rHandLength =0;
var lFootLength = 0;
var rFootLength = 0;



//INIT

$(document).ready(function(){
  generationSeed = Math.random()*100
  generationSeed = generationSeed.toFixed(seedPrecision)

  init()
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

function generateSong(){
  

  generationSeed = Math.random()*100
  generationSeed = generationSeed.toFixed(seedPrecision)
  seed = generationSeed
  $('#seed').html(generateSeed(seed))

  getParams()

  resolution = baseResolution
  maxLength = Math.max(maxLength, resolution)
  var count = 0
  do {
    reset()
    randomDrum()
    count++;
  }
  while(max > maxLength  && count <50)

  displayParams()
  drawTab()
  setInterval(scheduler, 20);
  play = true;
}
//Concatenates all needed params for the seed
function generateSeed(){
  var s = tempo + '-' + baseResolution + '-' + maxLength + '-' + density + '-'+ complexity*100 +  '-' + (useLeftFoot?1:0) + '-' + (orchestrate?1:0) + '-' +  generationSeed
  return s;
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


  complexity = parseInt(s[4])/100 || 50
  $('#complexity').val(complexity*100)
  $('#complexityResult').html(complexity*100)


  useLeftFoot = parseInt(s[5]) ==0? false: true|| false
  $('#leftFoot').prop('checked', useLeftFoot);

  orchestrate = parseInt(s[6]) ==0? false: true|| false
  $('#orchestrate').prop('checked', orchestrate);

  seed = parseFloat(s[7]) || 1
  generationSeed = seed
   
  
  $('#seed').html(generateSeed())
  
  resetAndLoad()
}
//generate song without chosing a new seed
function resetAndLoad(){
  getParams()

  resolution = baseResolution
  maxLength = Math.max(maxLength, resolution)
  
  var count = 0
  do {
    reset()
    randomDrum()
    count++;
  }
  while(max > maxLength  && count <50)

  displayParams()
  drawTab()
  setInterval(scheduler, 20);
  play = true;
}

function reset(){
  context.resume()
  clearInterval(schedulerTimer);
  cursor = 0;
  max = 1;
  commandList = []
  lFootLength = 0;
  rFootLength = 0;
  lHandLength = 0;
  rHandLength = 0;
  generateLengths()
}
function resetContext(){
  context.close()
  context = new AudioContext
}


function init(){
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext
  context.suspend()
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
function getParams(){
   baseResolution = parseInt($('#resolution').val())
   tempo = parseInt($('#tempo').val())
   maxLength = parseInt($('#maxLength').val())
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
//
function pause(){
  play = !play
  if(!play)
    context.suspend()
  else
    context.resume()
  $('#pause').html(play? 'pause':'play')
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
  //sequence = 0 means no note at that position
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



function generateLengths(){
  var l1,l2,l3,l4;
  l1 = baseResolution

  do{
    l2 = getRandomInt(minStep,maxStep)
  }
  while(l2 == l1)

  do{
    l3 = getRandomInt(minStep,maxStep)
  }
  while(l3 == l1 || l3 == l2)

  do{
    l4 = getRandomInt(minStep,maxStep)
  }
  while(l4 == l1 || l4 == l2 || l4 == l3)


  if(getRandomFloat(0,100)<=(100-difficulty))
    l2 = l1
  if(getRandomFloat(0,100)<=(100-difficulty))
    l3 = l2
  if(getRandomFloat(0,100)<=(100-difficulty))
    l4 = l3

  if(getRandomFloat(0,100)<(1-complexity)*100){
    var arr = [l2,l3,l4].shuffle()
    lHandLength = arr[0]
    rHandLength = arr[1]
    lFootLength = l1
    rFootLength = arr[2]
  }
  
  else{
    var arr = [l1,l2,l3,l4].shuffle()
    lHandLength = arr[0]
    rHandLength = arr[1]
    lFootLength = arr[2]
    rFootLength = arr[3]
  }

}

//Generates sequence of notes based on random params
function randomSequence(limb){
  var seq = []
  var instruments = [];

  if (limb == 'leftHand'){
    instruments = ['snare','opHiHat','highTom'];
  }
  else if (limb == 'rightHand'){
    instruments = ['ride','snare', 'opHiHat','highTom', 'medTom', 'floorTom'];
  }
  else if (limb == 'leftFoot'){
    instruments = ['footHiHat'];
  }
  else if(limb == 'rightFoot'){
    instruments = ['kick'];
  }

  var stepsAdded = 0
  //Initialize the sequence with all empty steps
  for(var i = 0;i<getLength(limb);i++){
    var instrument = orchestrate? instruments[Math.floor(getRandomFloat(0,1)*instruments.length)] : instruments[0]
    seq[i] = empty
    //randomly add notes
    if(getRandomFloat(0,1)*100<getDensity(limb)){
      seq[i] = instrument
      stepsAdded++
    }
    //extra chance to add note on sequence start
    if(i%length == 0 && getRandomFloat(0,1)*50<getDensity(limb)){
      seq[i] = instrument
      stepsAdded++
    }
  }
  //if empty, add one random step
  if(stepsAdded == 0)
    seq[getRandomInt(0,seq.length-1)] = instrument
  return seq
}

//Generate 3 random commands: kick/snare/hihat and adds them to the command list
function randomDrum(){
  commandList = []

  var metronome = new Limb('metronome') 
  var metronomeSequence = ['metronome']
  var metronomeCommand = new Command(metronome,metronomeSequence,'Metronome')
  metronomeCommand.muted = metronomeMute
  commandList.push(metronomeCommand)

  var leftHand = new Limb('leftHand') 
  var leftHandSeq = randomSequence('leftHand')
  var leftHandCommand = new Command(leftHand,leftHandSeq,'LeftHand')
  commandList.push(leftHandCommand)

  var rightHand = new Limb('rightHand') 
  var rightHandSeq = randomSequence('rightHand')
  var rightHandCommand = new Command(rightHand,rightHandSeq,'RightHand')
  commandList.push(rightHandCommand)

  var leftFoot = new Limb('leftFoot') 
  var leftFootSequence = randomSequence('leftFoot')
  var leftFootCommand = new Command(leftFoot,leftFootSequence,'LeftFoot')
  if(useLeftFoot)
    commandList.push(leftFootCommand)

  var rightFoot = new Limb('rightFoot') 
  var rightFootSequence = randomSequence('rightFoot')
  var rightFootCommand = new Command(rightFoot,rightFootSequence,'RightFoot')
  commandList.push(rightFootCommand)

   for(var i = 0;i<commandList.length;i++){
    max = lcm(max,commandList[i].sequence.length)
  }

  commandList.forEach(function(c){
    var n = max/c.sequence.length
    c.sequenceRepeated = repeatArray(c.sequence,n)
  })

  var loops = Math.floor(max/resolution)
  var remainder = max%resolution
  var remain = remainder == 0 ? '' : (' and ' + remainder + ' steps')
  $('#loop').html('</br><div>Loops in <b>' + loops + '</b> ' + resolution +  '/4 bars' + remain + '</div>' ) 
}


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
  var kick = new Array(max).fill(emptyDiv);
  var snare = new Array(max).fill(emptyDiv);
  var highTom = new Array(max).fill(emptyDiv);
  var medTom = new Array(max).fill(emptyDiv);
  var floorTom = new Array(max).fill(emptyDiv);
  var hiHat = new Array(max).fill(emptyDiv);
  var ride = new Array(max).fill(emptyDiv);
  var footHiHat = new Array(max).fill(emptyDiv);

  commandList.forEach(function(c){
    for(var i = 0;i<c.sequenceRepeated.length;i++){
      if(c.sequenceRepeated[i] == 'highTom')
        if(highTom[i] == emptyDiv)
          highTom[i] = '<div class="step ' + c.name+ '">\u25CF</div>'
        else
         highTom[i] ='<div class="step fla">\u25CF</div>'

      else if(c.sequenceRepeated[i] == 'medTom')
        if(medTom[i] == emptyDiv)
          medTom[i] = '<div class="step ' + c.name+ '">\u25CF</div>'
        else
          medTom[i] ='<div class="step fla">\u25CF</div>'

      else if(c.sequenceRepeated[i] == 'snare')
        if(snare[i] == emptyDiv)
          snare[i] = '<div class="step ' + c.name+ '">\u25CF</div>'
        else
          snare[i] ='<div class="step fla">\u25CF</div>'

      else if(c.sequenceRepeated[i] == 'opHiHat')
        if(hiHat[i] == emptyDiv)
           hiHat[i] = '<div class="step ' + c.name+ '">\u2297</div>'
        else
           hiHat[i] = '<div class="step fla">\u2297</div>'

      else if(c.sequenceRepeated[i] == 'clHiHat')
        if(hiHat[i] == emptyDiv)
           hiHat[i] = '<div class="step ' + c.name+ '">x</div>'
        else
           hiHat[i] = '<div class="step fla">x</div>'

      else if(c.sequenceRepeated[i] == 'floorTom')
        floorTom[i] = '<div class="step ' + c.name+ '">\u25CF</div>'

      else if(c.sequenceRepeated[i] == 'kick')
        kick[i] = '<div class="step ' + c.name+ '">\u25CF</div>'


      else if(c.sequenceRepeated[i] == 'ride')
        ride[i] = '<div class="step ' + c.name+ '">X</div>'

      else if(c.sequenceRepeated[i] == 'footHiHat')
        footHiHat[i] = '<div class="step ' + c.name+ '">x</div>'
    }
  })

  for(var i = 0;i<hiHat.length;i++){
    if(hiHat[i] == '<div class="step RightHand">\u2297</div>')
      if(footHiHat[i] == '<div class="step LeftFoot">x</div>')
        hiHat[i] = '<div class="step RightHand">x</div>'

    if(hiHat[i] == '<div class="step LeftHand">\u2297</div>')
      if(footHiHat[i] == '<div class="step LeftFoot">x</div>')
        hiHat[i] = '<div class="step LeftHand">x</div>'

    if(hiHat[i] == '<div class="step fla">\u2297</div>')
      if(footHiHat[i] == '<div class="step LeftFoot">x</div>')
        hiHat[i] = '<div class="step fla">x</div>'
  }
  
  
  result += '<div class="sheetLine"><div class="instrLabel"><b>Ride</b></div>' + drawArray(ride) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>HiHat</b></div>' + drawArray(hiHat) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>highTom</b></div>' + drawArray(highTom) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>medTom</b></div>' + drawArray(medTom) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>Snare</b></div>' + drawArray(snare) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>floorTom</b></div>' + drawArray(floorTom) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>Kick</b></div>' + drawArray(kick) + '</div></br>'
  result += '<div class="sheetLine"><div class="instrLabel"><b>FootHiHat</b></div>' + drawArray(footHiHat) + '</div></br>'

  $('#sheet').html(result)

  for(var i = 1;i<max;i+=resolution){
    $('.sheetLine .step:nth-child('+ i + ')' ).css({
                 "border-right-width":"1px", 
                 "border-right-style":"solid"});
  }
  $('.sheetLine .step' ).css({"border-bottom-color": "black", "border-bottom-width":"0px", "border-bottom-style":"solid"});
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










