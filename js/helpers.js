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









