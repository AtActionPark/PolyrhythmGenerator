Test for generating drum polyrhythms.

Parameters are:

* Tempo
* Time Signature
* Max length (desired maximum length in step of the output. Not taken into account if not possible)
* Density (0: few notes, 4: lots of notes per sequence)
* Number of Rhythms (how many different length rhythm do we want)
* Left foot
* Orchestrate (if unticked, each limb will only play one instrument)
* Euclidean (use euclidean rhythm - bjorklund algo - to produce evenly distributed patterns)

And a way to force specific length for each limb. If used, the Number of Ryhthm param will not be used anymore

[html preview](http://rawgit.com/AtActionPark/polyrhythmGenerator/master/index.html)



