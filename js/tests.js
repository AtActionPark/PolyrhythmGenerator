//lets generate a random song, create a seed, load it, and compare to the original 
QUnit.config.autostart = false;
var unitTest = false

function test(){
	if(!unitTest)
		QUnit.start()
	
	startTest()
}
function startTest(){
	if(!unitTest){
    	$('body').append('<div id="qunit"></div><div id="qunit-fixture"></div>')
  	}
  	unitTest = true;

	var s;
	QUnit.test( "init", function( assert ) {
		generateSong()
		play = false
		s = generateSeed()
		assert.equal( 1 ,1, "init" );

		setTimeout(QUnit.test( "Seeding Sequence", function( assert ) {
					var beforeSequence1 = commandList[1].sequenceRepeated;
					var beforeSequence2 = commandList[2].sequenceRepeated;
					var beforeSequence3 = commandList[3].sequenceRepeated;
					var beforeSequence4 = commandList[4].sequenceRepeated;

					loadSeed(s)
					play = false

					var afterSequence1 = commandList[1].sequenceRepeated;
					var afterSequence2 = commandList[2].sequenceRepeated;
					var afterSequence3 = commandList[3].sequenceRepeated;
					var afterSequence4 = commandList[4].sequenceRepeated;

					assert.deepEqual( afterSequence1 ,beforeSequence1, "Same  sequence 1" );
					assert.deepEqual( afterSequence2 ,beforeSequence2, "Same  sequence 2" );
					assert.deepEqual( afterSequence3 ,beforeSequence3, "Same  sequence 3" );
					assert.deepEqual( afterSequence4 ,beforeSequence4, "Same  sequence 4" );

				})
		,200)
	});
}







