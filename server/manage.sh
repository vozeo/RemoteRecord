#! /bin/bash

DIR=$1
FNAME_CAMERA=$2
FNAME_SCREEN=$3

old_dir=`pwd`

cp ./binding.sh $DIR
cd $DIR
pwd

./binding.sh camera $FNAME_CAMERA
mv $FNAME_CAMERA camera

./binding.sh screen $FNAME_SCREEN

mv $FNAME_SCREEN screen

mv merge*.txt waste

rm ./binding.sh

cd $old_dir
pwd
