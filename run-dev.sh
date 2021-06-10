#!/bin/bash

docker run --rm -it \
	--publish 3000:8080 \
	--publish 1022:22 \
	--name poly-jitsi-test \
	-v $(pwd):/home/poly/jitsi-poly \
	poly-jitsi /bin/bash