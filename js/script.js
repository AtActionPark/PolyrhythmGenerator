"use strict";
var dev = false;
// USER PARAMS
let tempo = 60.0;
//nb of steps per bar
let resolution = 4;
//duration of notes
let subdivision = 4;
//proba of having a beat on each step
let densityCategory = 2;
//limit for the result length in steps
let maxLength = 64;
let useLeftFoot = true;
let orchestrate = true;
let euclideanRhythm = false;
let nbOfRhythms = 1;

//FIXED PARAMS
// sequences length
const minStep = 2;
const maxStep = 11;
const flaTime = 0.04;
const possibleSubdivisions = [2,4,8];


//limb bias - some limbs will play a higher average nb of notes
const lHandDensityFactor = 1;
const rHandDensityFactor = 1;
const lFootDensityFactor = 0.7;
const rFootDensityFactor = 0.8;

const seedPrecision = 5;
const maxTry = 500;
let metronomeMute = true;

//mixer volumes
const snareGain = 0.6;
const kickGain = 0.9;
const clHiHatGain = 1;
const opHiHatGain = 0.9;
const footHiHatGain = 0.9;
const highTomGain = 0.9;
const medTomGain = 0.9;
const floorTomGain = 0.9;
const rideGain = 0.6;
const metronomeGain = 0.6;


//SCHEDULER
const lookahead = 25.0;
const scheduleAheadTime = 0.1;
let schedulerTimer;
let nextNoteTime = 0.0;

//stuff
let commandList = [];
let cursor = 0;
let max = 1;
let play = true;
let context;
let bufferLoader;
const empty = "-";
let generationSeed;
let seed;
let density;

let lHandLength = 0;
let rHandLength =0;
let lFootLength = 0;
let rFootLength = 0;

let forceLength = false;
let forceLeftHand = 0;
let forceRightHand = 0;
let forceLeftFoot = 0;
let forceRightFoot = 0;

let kickSound = null;
let snareSound = null;
let clHiHatSound = null;
let opHiHatSound = null;
let metronomeSound = null;
let rideSound = null;
let highTomSound = null;
let medTomSound = null;
let floorTomSound = null;

let locked = true;

//canvas stuff
let canvas;
let ctx;
const startSpace = 80;
const hStartSpace = 20;
const hSpace = 20;
const wSpace = 20;
const noteRadius = hSpace/3;
const noteRadiusSmall = hSpace/4;
const rideBias = 3;

$(document).ready(() =>{
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  window.AudioContext = window.AudioContext || window.webkitAudioContext;

  context = new AudioContext();
  context.suspend();
  initCanvas();
  let read = false;

  if(iOS){
    window.addEventListener("touchend",iosHandler , false);
  }
  else{
    //async loading of all samples
    loadSamples();
    if(readURL())
      read = true
      $(".tiptext").mouseover(function() {
        $(this).children(".description").show();
      }).mouseout(function() {
          $(this).children(".description").hide();
    });
    if(!read){
      getUserParams();
      createEmptyDrumCommands();

      displayParams();
      drawSheet();
    }
  }

  //bootstrap toggles closes automatically on click - recreate the open/close behaviour manually
  $('.dropdown-toggle').on('click', function (event) {
    $(this).parent().toggleClass('open');
  });

  $('body').on('click', function (e) {
    if (!$('.dropdown-toggle').is(e.target) 
        && $('.dropdown-toggle').has(e.target).length === 0 
        && $('.open').has(e.target).length === 0){
      $('.dropdown-toggle').removeClass('open');
    }
  }); 
});

function iosHandler(e){
  if (locked){
    alert("unlocked");
    locked = false;
    // create empty buffer
    const buffer = context.createBuffer(1, 1, 22050);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.noteOn(0);

    loadSamples();
    //readURL();
  }
}

//entry point for generation.
function generateSong(){
  generationSeed = Math.random();
  generationSeed = generationSeed.toFixed(seedPrecision);

  seed = generationSeed;
  generateAndStart();
}
function generateAndStart(){
  reset();

  getUserParams();
  $("#seed").html(generateSeed(seed));
  if(!dev)
    shareSeed();

  //Need to check against specified max desired length

  //if user specified all lengths, max length is not variable
  if(forceLength){
    generateLengths();
  }
  // else, give the generator a few tries to find it
  else{
    let count = 0;
    do {
      generateLengths();
      count++;
    }while(max > maxLength  && count <maxTry); 
  }
  

  createDrumCommands();
  displayParams();

  drawSheet();

  setInterval(scheduler, 20);
  play = true;
}
function getUserParams(){
  resolution = parseInt($("#resolution").val());
  subdivision = parseInt($("#subdivision").val());

  tempo = $( window ).width() > 768? parseInt($("#tempo").val()) : parseInt($("#tempoxs").val());

  maxLength = parseInt($("#maxLength").val());
  if(maxLength<resolution){
    replaceMaxLength(resolution);
  }

  densityCategory = parseInt($("#density").val());
  density = densityCategory*25;

  nbOfRhythms = parseInt($("#nbOfRhythms").val());

  useLeftFoot = $("#useLeftFoot").is(":checked");
  orchestrate = $("#orchestrate").is(":checked");
  euclideanRhythm = $("#euclidean").is(":checked");

  if(forceLength){
    changeForce();
  }

  checkMaxLength();
}
function randomize(){
  generationSeed = Math.random();
  generationSeed = generationSeed.toFixed(seedPrecision);
  seed = generationSeed;

  var t = getRandomInt(30,120)
  $("#tempo").val(t);
  $("#tempoxs").val(t);
  $("#resolution").val(getRandomInt(2,9));
  $("#subdivision").val(pickRandomArray(possibleSubdivisions));
  $("#maxLength").val(getRandomInt(20,80));
  $("#density").val(getRandomInt(0,4));
  $("#nbOfRhythms").val(getRandomInt(2,4));
  $("#useLeftFoot").prop("checked", getRandomInt(0,1));
  $("#orchestrate").prop("checked", getRandomInt(0,1));
  $("#euclidean").prop("checked", getRandomInt(0,1));
  generateSong();

}
function changeTempo(){
  tempo = $( window ).width() > 768? parseInt($("#tempo").val()) : parseInt($("#tempoxs").val());
  $("#tempo").val(tempo)
  $("#tempoxs").val(tempo)
  if(tempo<1){
    tempo = 1;
  }
  if($("#seed").html() !== "-"){
    $("#seed").html(generateSeed(seed));
  }
}
function changeForceLength(){
  forceLength = $("#forceLength").is(":checked");
  $("#forceLeftHand").prop("disabled", !forceLength);
  $("#forceLeftFoot").prop("disabled", !forceLength);
  $("#forceRightHand").prop("disabled", !forceLength);
  $("#forceRightFoot").prop("disabled", !forceLength);

  $("#nbOfRhythms").prop("disabled", forceLength);
  $("#maxLength").prop("disabled", forceLength);
}
function changeForce(){
  forceLeftHand = parseInt($("#forceLeftHand").val());
  forceRightHand = parseInt($("#forceRightHand").val());
  forceLeftFoot = parseInt($("#forceLeftFoot").val());
  forceRightFoot = parseInt($("#forceRightFoot").val());
}
function readURL(){
  const url = window.location.href ;
  if(url.includes("?")){
    let captured = /\?([^&]+)/.exec(url)[1]; 
    loadSeed(captured);
    return true
  }
  return false;
}
function reset(){
  context.resume();
  clearInterval(schedulerTimer);
  cursor = 0;
  commandList = [];
  generateLengths();
}


//compute the minimum length with params and compare with user expectation
function checkMaxLength(){
  if(!forceLength){
    const mini = minPossibleLength(resolution,nbOfRhythms);
    if(mini>maxLength){
      replaceMaxLength(mini);
    }
  }
}
function replaceMaxLength(mini){
  maxLength = mini;
  $("#maxLength").val(mini);
  $("#maxLength").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
}


//SEED
//Concatenates all needed params for the seed
function generateSeed(){
  const subString = convertBase(resolution.toString(),10,12) 
    + ""+ parseInt(subdivision) 
    + ""  + parseInt(densityCategory) 
    + ""+ parseInt(nbOfRhythms) 
    +  "" + (useLeftFoot?1:0) + "" 
    + (orchestrate?1:0) + "" 
    + (euclideanRhythm?1:0);

  const s = parseInt(tempo) + "-" 
    + parseInt(maxLength) + "-" 
    + subString  ;

  const convertedParams = convertBase(s,13,64);
  const convertedSeed = convertBase(Math.round(parseFloat(generationSeed,10) * Math.pow(10,seedPrecision)).toString(),10,64);

  let result = convertedParams + "@" +  convertedSeed;

  if(forceLength){
    let forceString = "";
    forceString+= convertBase(forceLeftHand.toString(),10,12);
    forceString+= "" + convertBase(forceRightHand.toString(),10,12);
    forceString+= "" + convertBase(forceLeftFoot.toString(),10,12);
    forceString+= "" + convertBase(forceRightFoot.toString(),10,12);
    const convertedForceString = convertBase(forceString,12,64);
    result+= "@"+ convertedForceString;
  }
  return result;
}

//Reads the seed value input 
function readSeed(){
  const input = $("#seedInput").val().trim();
  loadSeed(input);
}
//generates a song according to the seed
function loadSeed(input){
  const s =input.split(/@/g);
  const convertedParams = s[0];
  const convertedSeed = s[1];
  const convertedForce = s[2];

  const reconvertedParams = convertBase(convertedParams,64,13);

  const reconvertedSeed = parseFloat(convertBase(convertedSeed,64,10),10).toFixed(seedPrecision);
  seed = reconvertedSeed/Math.pow(10,seedPrecision) || 1;

  let reconvertedForce;
  if(convertedForce){
    reconvertedForce = convertBase(convertedForce,64,12);
  }
  const params = reconvertedParams.split(/-/g);

  tempo = parseInt(params[0]) || 60;
  $("#tempo").val(tempo);
  $("#tempoxs").val(tempo);

  maxLength = parseInt(params[1]) || 32;
  $("#maxLength").val(maxLength);

  let paramsSubString = params[2].toString();
  paramsSubString = paramsSubString.split("");


  resolution = parseInt(convertBase(paramsSubString[0].toString(),12,10)) ||4;
  $("#resolution").val(resolution);

  subdivision = paramsSubString[1] ||4;
  $("#subdivision").val(subdivision);


  densityCategory = paramsSubString[2] || 0.5;
  $("#density").val(parseInt(densityCategory));
  density = densityCategory*20;

  nbOfRhythms = paramsSubString[3] || 2;
  $("#nbOfRhythms").val(parseInt(nbOfRhythms));

  useLeftFoot = paramsSubString[4] ==0? false: true|| false;
  $("#useLeftFoot").prop("checked", useLeftFoot);

  orchestrate = paramsSubString[5] ==0? false: true|| false;
  $("#orchestrate").prop("checked", orchestrate);

  euclideanRhythm = paramsSubString[6] ==0? false: true|| false;
  $("#euclidean").prop("checked", euclideanRhythm);

  

  forceLeftHand = 0;
  forceRightHand = 0;
  forceLeftFoot = 0;
  forceRightFoot = 0;
  if(reconvertedForce!= null){
    const force = reconvertedForce.split("");
    forceLeftHand = parseInt(convertBase(force[0],12,10)) || 0;
    forceRightHand = parseInt(convertBase(force[1],12,10)) || 0;
    forceLeftFoot = parseInt(convertBase(force[2],12,10)) || 0;
    forceRightFoot = parseInt(convertBase(force[3],12,10)) || 0;
    forceLength = false;
    $("#forceLength").prop("checked", forceLength);
    changeForceLength();
  }

  if(forceRightFoot>0 || forceRightHand>0 || forceLeftFoot>0 || forceLeftHand >0){
    forceLength = true;
    $("#forceLength").prop("checked", forceLength);
    changeForceLength();
    $("#forceLeftHand").val(parseInt(forceLeftHand));
    $("#forceRightHand").val(parseInt(forceRightHand));
    $("#forceLeftFoot").val(parseInt(forceLeftFoot));
    $("#forceRightFoot").val(parseInt(forceRightFoot));
  }

  generationSeed = seed;
  
  $("#seed").html(generateSeed());
  
  generateAndStart();
}
function shareSeed(){
  //
  window.history.pushState("seed", "seed", "/PolyrhythmGenerator/?"+generateSeed());
}



//SCHEDULER
//Advances the cursor for reading sequences and update display
function nextNote(){
  const secondsPerBeat = 60.0 / tempo *resolution/subdivision;
  nextNoteTime +=secondsPerBeat/resolution;
  const c = cursor+1;
  cursor++;

  drawSheet(c);
  if (cursor == max){
      cursor = 0;
  }
 }
//Look at the sequences and play all scheduled notes
function scheduler(){
  if(!play){
    return;
  }
  while(nextNoteTime < context.currentTime + scheduleAheadTime){
    commandList.forEach((c) => c.play(cursor));
    nextNote();
  }
}
function pause(){
  play = !play;
  if(!play){
    context.suspend();
  }
  else{
    context.resume();
  }
  $("#pause").html(play? "<span class='glyphicon glyphicon-pause'>":"<span class='glyphicon glyphicon-play'>");
}


//LIMB
//This is needed because the output needs to be playable. It's not enough to randomize every piece of the drum set,
// we need to make sure that we have at most 4 hits at the same time, and that each limb has a set of associated instruments
function Limb(name){
  this.name = name;
  this.instruments = getInstrument(name);
  this.gain = context.createGain();
  this.gain.connect(context.destination);
}
//To play a note we need the intrument played (kick, snare...), as well as the cursor position. This is needed to check for flas
Limb.prototype.play = function(instr,c){
  this.source = context.createBufferSource();
  this.source.connect(this.gain);
  this.source.buffer = getBuffer(instr);
  this.gain.gain.value = getGain(instr);

  let time = 0;
  if(isFla(this.name,c)){
    time = context.currentTime + flaTime;
  }
  
  this.source.start(time);
};

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
  if(this.muted){
    return;
  }

  let limb = this.limb;
  if(this.sequenceRepeated[c] != empty ){
    limb.play(this.sequenceRepeated[c],c);
  }
};
//Returns basic info/buttons for the sequence
Command.prototype.display = function(){
  const mute = "<input id=" + this.limb.name + " type=checkbox><label></label>";
  const length = "<div class=' arrow glyphicon glyphicon-arrow-right'> </div> " + pad(this.sequence.length,2)  + " steps";
  let result = "";
  for(let i = 0;i<this.sequence.length;i++){
    const res = this.sequence[i] != empty? 'x' : empty
    result +=  res + " ";
  }

  if(this.limb.name === "metronome"){
    return  mute + "<div class='limbDiv inline'><b><div class='inline '"+ this.limb.name + ">" + this.name + "</b></div></div></br>";
  }
  return mute + "<div class='limbDiv inline'><b><div class='inline "+ this.limb.name + "'>" + this.name + "</div>" + length + " : " + result +  "</b></div></br>";
}

//MAIN ALGO
//generates the length of the sequence for each limb. Depending on the nbOfRhythms, all sequences' lengths could be the same or different
function generateLengths(){
  //start by making sure that the resolution is in the array of possible lengths
  let lengths = [resolution];

  //continue populationg the array until we have 3 additional random values
  while(lengths.length<4){
    const randomnumber=getRandomInt(minStep,maxStep);
    let found=false;
    for(let i=0;i<lengths.length;i++){
      if(lengths[i]==randomnumber){
        found=true;break;
      }
    }
    if(!found){
      lengths[lengths.length]=randomnumber;  
    }
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
    lengths = lengths.slice(1,4).shuffle();
    lengths.unshift(resolution);
  }
  else{
    lengths = lengths.shuffle();
  }

  lFootLength = lengths[0];
  lHandLength = lengths[1];
  rHandLength = lengths[2];
  rFootLength = lengths[3];

  if(forceLength){
     lHandLength = forceLeftHand;
     lFootLength = forceLeftFoot;
     rHandLength = forceRightHand;
     rFootLength = forceRightFoot;
  }

  lengths = [lFootLength,lHandLength,rFootLength,rHandLength];

  // compute the max number of steps of the song
  max = getLoopLength(lengths);
}
function getLoopLength(arr){
  let result = 1;
  for(let i = 0;i<arr.length;i++){
    result = lcm(result,arr[i]);
  }
  return result;
}
//Generates sequence of notes based on random params and precalculated length
function randomSequence(limb){
  if(euclideanRhythm){
    const pulses = parseInt(getRandomInt(minStep,getLength(limb.name)*1.0*getDensity(limb.name)/100));
    let pattern = bjorklund(getLength(limb.name),pulses);
    for(let i = 0;i<pattern.length;i++){
      if(pattern[i] == 1){
        pattern[i] = pickRandomArray(limb.instruments);
      }
      else{
        pattern[i] = empty;
      }
    }

    return pattern;
  }
  

  let seq = [];
  let stepsAdded = 0;
  let instrument;
  //Initialize the sequence with all empty steps
  for(let i = 0;i<getLength(limb.name);i++){
    instrument = pickRandomArray(limb.instruments);
    seq[i] = empty;
    //randomly add notes
    if(getRandomFloat(0,1)*100<getDensity(limb.name)){
      seq[i] = instrument;
      stepsAdded++;
    }
    //extra chance to add note on sequence start
    if(i%length == 0 && getRandomFloat(0,1)*50<getDensity(limb.name)){
      seq[i] = instrument;
      stepsAdded++;
    }
  }
  //if empty, add one random step
  if(stepsAdded == 0){
    seq[getRandomInt(0,seq.length-1)] = instrument;
  }
  return seq;
}
//Generate 1 random commands for each limb and adds them to the command list
function createDrumCommands(){
  commandList = [];

  const metronome = new Limb("metronome");
  const metronomeSequence = ["metronome"];
  const metronomeCommand = new Command(metronome,metronomeSequence,"Metronome");
  metronomeCommand.muted = metronomeMute;
  commandList.push(metronomeCommand);

  const leftHand = new Limb("leftHand");
  const leftHandSeq = randomSequence(leftHand);
  const leftHandCommand = new Command(leftHand,leftHandSeq,"Left Hand");
  commandList.push(leftHandCommand);

  const rightHand = new Limb("rightHand");
  const rightHandSeq = randomSequence(rightHand);
  const rightHandCommand = new Command(rightHand,rightHandSeq,"Right Hand");
  commandList.push(rightHandCommand);

  const leftFoot = new Limb("leftFoot");
  const leftFootSequence = randomSequence(leftFoot);
  const leftFootCommand = new Command(leftFoot,leftFootSequence,"Left Foot ");
  if(useLeftFoot){
    commandList.push(leftFootCommand);
  }

  const rightFoot = new Limb("rightFoot");
  const rightFootSequence = randomSequence(rightFoot);
  const rightFootCommand = new Command(rightFoot,rightFootSequence,"Right Foot");
  commandList.push(rightFootCommand);

  
  //repeat each sequence so that their total length is the max nb of steps
  commandList.forEach(c =>{
    const n = max/c.sequence.length;
    c.sequenceRepeated = repeatArray(c.sequence,n);
  })

  //go through the sequence and check simultaneaous hand and foot hihat
  for(let c = 0;c<max;c++){
    if(commandList[3].sequenceRepeated[c] == "footHiHat" ){
      if(commandList[1].sequenceRepeated[c] == "opHiHat"){
        commandList[1].sequenceRepeated[c] = "clHiHat";
      }
      if(commandList[2].sequenceRepeated[c] == "opHiHat"){
        commandList[2].sequenceRepeated[c] = "clHiHat";
      }
    }
  }
  

  //compute the nb of bars needed
  const loops = Math.floor(max/resolution);
  const remainder = max%resolution;
  const remain = remainder == 0 ? "" : (" and " + remainder + " steps");
  $("#loop").html("Loops in <b>" + loops + "</b> " + resolution +  "/" + subdivision+ " bars" + remain + " ("+ max+ " steps)" );
}
//Only used on init to have something to display
function createEmptyDrumCommands(){
  commandList = [];
  max = 16;
  const empt = [empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty]

  const metronome = new Limb("metronome");
  const metronomeSequence = empt;
  const metronomeCommand = new Command(metronome,metronomeSequence,"Metronome");
  metronomeCommand.muted = metronomeMute;
  commandList.push(metronomeCommand);

  const leftHand = new Limb("leftHand");
  const leftHandSeq = empt;
  const leftHandCommand = new Command(leftHand,leftHandSeq,"Left Hand");
  commandList.push(leftHandCommand);

  const rightHand = new Limb("rightHand");
  const rightHandSeq = empt;
  const rightHandCommand = new Command(rightHand,rightHandSeq,"Right Hand");
  commandList.push(rightHandCommand);

  const leftFoot = new Limb("leftFoot");
  const leftFootSequence = empt;
  const leftFootCommand = new Command(leftFoot,leftFootSequence,"Left Foot");
  commandList.push(leftFootCommand);

  const rightFoot = new Limb("rightFoot");
  const rightFootSequence = empt;
  const rightFootCommand = new Command(rightFoot,rightFootSequence,"Right Foot");
  commandList.push(rightFootCommand);

  
  //compute the nb of bars needed
  const loops = Math.floor(max/resolution);
  const remainder = max%resolution;
  const remain = remainder == 0 ? "" : (" and " + remainder + " steps");
  $("#loop").html("Loops in <b>" + loops + "</b> " + resolution +  "/" + subdivision+ " bars" + remain + " ("+ max+ " steps)" );
}

//DISPLAY
//Display characteristics of the random ong and add a mute command
function displayParams(){
  $("#pauseDiv").empty();
  $("#pauseDiv").append("<button id='pause' class='btn' onClick='pause()''><span class='glyphicon glyphicon-pause'></span></button>");

  $("#limbs").empty();

  commandList.forEach(c =>{
    $("#limbs").append(c.display());
    //show mute icon
    if(c.muted){
      $("#" + c.limb.name + "").prop("checked", false);
    }
    else{
       $("#" + c.limb.name + "").prop("checked", true);
    }
    //set mute/unmute
    $("#" + c.limb.name + "").click(function(){
      if($(this).is(":checked")){
        c.muted = false;
        if(c.limb.name == "metronome"){
          metronomeMute = false;
        }
      }
      else{
        c.muted = true;
        if(c.limb.name == "metronome"){
          metronomeMute = true;
        }
      }
    })
  })
}


function initCanvas(){

  const c = $("<canvas id='canvas' width='0' height='0''></canvas>");
  $("#canvasDiv").append(c);
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
}

function drawSheet(c){
  canvas.width = max*wSpace + startSpace - hSpace/2;
  canvas.height = hStartSpace+6*hSpace;
  const length = max*wSpace + startSpace;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "black";
  ctx.font = "bold 59px Arial";
  const x = resolution>9? startSpace - 85 : startSpace-55;
  ctx.fillText(resolution, x, 80);
  ctx.fillText(subdivision, startSpace-55, 120);

  //first line
  ctx.strokeStyle = "white";
  ctx.beginPath();
  ctx.moveTo(0,startSpace);
  ctx.lineTo(length,startSpace);
  ctx.stroke();
  ctx.closePath();

  //horizontal lines
  ctx.strokeStyle = "black";
  ctx.beginPath();
  for (let i = 1;i<6;i++){
    ctx.moveTo(0,i*hSpace+hStartSpace);
    ctx.lineTo(length,i*hSpace+hStartSpace);
    ctx.stroke();
  }
  ctx.closePath();
  
  //vertical lines
  for(let i = 0;i<=max;i++){
    
    if(i%resolution == 0){
      ctx.lineWidth = 3;
      ctx.strokeStyle = "black";
    }
    else{
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "grey";
    }
    ctx.beginPath();
    ctx.moveTo(startSpace - wSpace/2 + i*wSpace,hSpace+hStartSpace);
    ctx.lineTo(startSpace - wSpace/2 + i*wSpace,5*hSpace+hStartSpace);
    ctx.stroke();
    ctx.closePath();
  }
  //cursor line
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.moveTo(startSpace - wSpace/2 + (c-1)*wSpace,hStartSpace);
  ctx.lineTo(startSpace - wSpace/2 + (c-1)*wSpace,6*hSpace+hStartSpace);
  ctx.lineTo(startSpace - wSpace/2 + (c)*wSpace,6*hSpace+hStartSpace);
  ctx.lineTo(startSpace - wSpace/2 + (c)*wSpace,hStartSpace);
  ctx.lineTo(startSpace - wSpace/2 + (c-1)*wSpace,hStartSpace);
  ctx.stroke();
  ctx.closePath();
  
  //notes
  commandList.forEach(co =>{
    co.sequenceRepeated.forEach((note,i)=>{
      drawNote(ctx,note,i,co.limb.name,co);
    })
  })
}
function drawNote(ctx,note,i,limb,co){
  if(co.muted){
    return
  }
  if(note == "snare" || note == "kick" || note == "highTom" || note == "medTom" || note == "floorTom"){
    drawNoteHead(i,note,limb,isFla(limb,i));
  }
  if(note == "clHiHat" || note == "footHiHat" ){
    drawSmallX(i,note,limb,isFla(limb,i));
  }
  if(note == "opHiHat"){
    drawSmallX(i,note,limb,isFla(limb,i));
    drawEmptyCircle(i,note,limb,isFla(limb,i));
  }
  if(note == "ride"){
    drawBigX(i,note,limb,isFla(limb,i));
  }
}

function drawNoteHead(i,note,limb,fla){
  const x = startSpace + i*wSpace;
  const y = getHeight(note);
  const sc = 0.25;
  let ULx, ULy; // Upper Left corner
  let LLx, LLy; // Lower Left corner
  let URx, URy; // Upper Right corner
  let LRx, LRy; // Lower Right corner
  let CLx, CLy; // Center Left 
  let CRx, CRy; // Center Right

  ULx = x - 30*sc;
  ULy = y - 28*sc;
  URx = x + 30*sc;
  URy = y - 38*sc;

  LLx = x - 30*sc;
  LLy = y + 38*sc;
  LRx = x + 30*sc;
  LRy = y + 28*sc;

  CLx=(ULx+LLx)/2;  // Center Left point
  CLy=(ULy+LLy)/2;
  CRx=(URx+LRx)/2;  // Center Right point
  CRy=(URy+LRy)/2;

  

  // Draw the curves and fill them in:
  ctx.beginPath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "black";
  ctx.fillStyle = getColor(limb,fla);
  ctx.moveTo(CLx, CLy);
  ctx.bezierCurveTo(ULx, ULy, URx, URy, CRx, CRy);
  ctx.bezierCurveTo(LRx, LRy, LLx, LLy, CLx, CLy);
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}
function drawEmptyCircle(i,note,limb,fla){
  ctx.beginPath();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = getColor(limb, false);
  ctx.arc(startSpace + i*wSpace,getHeight(note),noteRadius,0,2*Math.PI);
  ctx.stroke();
  ctx.closePath();
}
function drawBigX(i,note,limb,fla){
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = getColor(limb, false);
  ctx.moveTo(startSpace + i*wSpace - noteRadius ,getHeight(note)-noteRadius);
  ctx.lineTo(startSpace + i*wSpace + noteRadius ,getHeight(note)+noteRadius);
  ctx.stroke();
  if(fla){
    ctx.closePath();
    ctx.beginPath();
    ctx.strokeStyle = getOppositeColor(limb);
  }
  ctx.moveTo(startSpace + i*wSpace - noteRadius ,getHeight(note)+noteRadius);
  ctx.lineTo(startSpace + i*wSpace + noteRadius ,getHeight(note)-noteRadius);
  ctx.stroke();
  ctx.closePath();
}
function drawSmallX(i,note,limb,fla){
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = getColor(limb, false);
  ctx.moveTo(startSpace + i*wSpace - noteRadiusSmall ,getHeight(note)-noteRadiusSmall);
  ctx.lineTo(startSpace + i*wSpace + noteRadiusSmall ,getHeight(note)+noteRadiusSmall);
  ctx.stroke();
  if(fla){
    ctx.closePath();
    ctx.beginPath();
    ctx.strokeStyle = getOppositeColor(limb);
  }
  ctx.moveTo(startSpace + i*wSpace - noteRadiusSmall ,getHeight(note)+noteRadiusSmall);
  ctx.lineTo(startSpace + i*wSpace + noteRadiusSmall ,getHeight(note)-noteRadiusSmall);
  ctx.stroke();
  ctx.closePath();
}
function drawMiddleLine(i,note,limb,fla){
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "black";
  ctx.moveTo(startSpace + i*wSpace - noteRadius - rideBias ,getHeight(note));
  ctx.lineTo(startSpace + i*wSpace + noteRadius + rideBias ,getHeight(note));
  ctx.stroke();
  ctx.closePath();
}
function isMuted(limb){
  return limb.muted;
}
























