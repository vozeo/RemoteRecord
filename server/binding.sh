#! /bin/bash
MATCH_NAME="$1"
FINAL_FILE="$2"
MERGE_INDEX="merge_$1.txt"

mkdir -p waste

files=`find . -maxdepth 1 -size +10 -name "*-${MATCH_NAME}*.webm"|sort`
cnt=0


>"${MERGE_INDEX}"

for i in $files
do
	cnt=$[ $cnt + 1 ]
	echo "file $i">>"${MERGE_INDEX}"
done


ffmpeg -f concat -safe 0 -loglevel quiet -y -i ${MERGE_INDEX} -c copy ${FINAL_FILE}

for i in $files
do
	mv $i waste
done

echo "$cnt $1 clips merged to ${FINAL_FILE}."

