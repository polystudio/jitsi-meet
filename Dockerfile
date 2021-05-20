FROM ubuntu:18.04

### Setting up basic packages
USER root
RUN apt update
RUN apt install sudo make curl git -y

### Setting up user "poly" as a superuser
USER root
RUN apt install -y sudo
RUN adduser --shell /bin/bash --disabled-password --gecos '' poly
RUN usermod -aG sudo poly
RUN echo "poly     ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

### Setting up nodejs and npm
USER root
RUN curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
RUN apt update && apt install -y nodejs

### Setting up project files 
USER poly
RUN mkdir /home/poly/jitsi-poly
COPY --chown=poly . /home/poly/jitsi-poly

### Setting up entry interfaces
EXPOSE 8080
WORKDIR /home/poly/jitsi-poly
USER poly