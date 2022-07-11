#! /bin/bash
MATCH_NAME="$1"
FINAL_FILE="$2"
MERGE_INDEX="merge_$1.txt"

mkdir -p waste

files=`find . -maxdepth 1 -size +3 -name "*-${MATCH_NAME}*.webm"|sort`

if [[ $files ]]
then
	cat $files>tmp.webm
	#ffmpeg -i tmp.webm -threads 5 -loglevel quiet -y -f mp4 $FINAL_FILE
	ffmpeg -i tmp.webm -loglevel quiet -y -c copy -f mp4 $FINAL_FILE
	rm tmp.webm
	echo "done"
	mv $files waste
fi
