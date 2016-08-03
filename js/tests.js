//lets generate a random song, create a seed, load it, and compare to the original 
QUnit.config.autostart = false;
let unitTest = false

function runTest(){
	if(!unitTest)
		QUnit.start()
	
	startTest()
}
function startTest(){
	if(!unitTest){
    	$('body').append('<div id="qunit"></div><div id="qunit-fixture"></div>')
  	}
  	unitTest = true;

	let s;
	QUnit.test( "init", function( assert ) {
		generateSong()
		context.suspend()
		s = generateSeed()
		assert.equal( 1 ,1, "init" );

		setTimeout(QUnit.test( "Seeding Sequence", function( assert ) {
					const beforeSequence1 = commandList[1].sequenceRepeated;
					const beforeSequence2 = commandList[2].sequenceRepeated;
					const beforeSequence3 = commandList[3].sequenceRepeated;
					const beforeSequence4 = commandList[4].sequenceRepeated;

					loadSeed(s)
					play = false

					const afterSequence1 = commandList[1].sequenceRepeated;
					const afterSequence2 = commandList[2].sequenceRepeated;
					const afterSequence3 = commandList[3].sequenceRepeated;
					const afterSequence4 = commandList[4].sequenceRepeated;

					assert.deepEqual( afterSequence1 ,beforeSequence1, "Same  sequence 1" );
					assert.deepEqual( afterSequence2 ,beforeSequence2, "Same  sequence 2" );
					assert.deepEqual( afterSequence3 ,beforeSequence3, "Same  sequence 3" );
					assert.deepEqual( afterSequence4 ,beforeSequence4, "Same  sequence 4" );

				})
		,200)
	});
}







