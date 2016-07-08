//greatest common denominator
function gcd(a,b){
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
function pickRandomProperty(obj) {
    var keys = Object.keys(obj)
    return keys[ keys.length * rand() << 0 ];
}
function pickRandomArray(arr) {
    return arr[arr.length * rand() << 0 ];
}

//Returns a random number roughly following a gaussian distrubution (center: 0 - std dev:1)
function getRandomGaussian() {
    var u = 1 - getRandomFloat(0,1); // Subtraction to flip [0, 1) to (0, 1].
    var v = 1 - getRandomFloat(0,1);
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function getRandomPow2(max){
  return Math.pow(2,getRandomInt(0,max))
}



function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function convertBase(value, from_base, to_base) {
  var range = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'.split('');
  var from_range = range.slice(0, from_base);
  var to_range = range.slice(0, to_base);
  
  var dec_value = value.split('').reverse().reduce(function (carry, digit, index) {
    if (from_range.indexOf(digit) === -1) throw new Error('Invalid digit `'+digit+'` for base '+from_base+'.');
    return carry += from_range.indexOf(digit) * (Math.pow(from_base, index));
  }, 0);
  
  var new_value = '';
  while (dec_value > 0) {
    new_value = to_range[dec_value % to_base] + new_value;
    dec_value = (dec_value - (dec_value % to_base)) / to_base;
  }
  return new_value || '0';
}

Array.prototype.shuffle = function() {
  var i = this.length, j, temp;
  if ( i == 0 ) return this;
  while ( --i ) {
     j = Math.floor( Math.random() * ( i + 1 ) );
     temp = this[i];
     this[i] = this[j];
     this[j] = temp;
  }
  return this;
}









