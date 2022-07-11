#! /bin/bash

DIR=$1
FNAME_CAMERA=$2
FNAME_SCREEN=$3

old_dir=`pwd`

cp ./binding.sh $DIR
cd $DIR
pwd

./binding.sh camera $FNAME_CAMERA
#cp $FNAME_CAMERA camera
#convmv -f utf-8 -t gbk --notest camera/$FNAME_CAMERA
mv $FNAME_CAMERA camera

./binding.sh screen $FNAME_SCREEN
#cp $FNAME_SCREEN screen
#convmv -f utf-8 -t gbk --notest screen/$FNAME_SCREEN
mv $FNAME_SCREEN screen

#mv merge*.txt waste

rm ./binding.sh

cd $old_dir
pwd
