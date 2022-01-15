FROM ubuntu:18.04

### Setting up basic packages
USER root
RUN apt update
RUN apt install sudo make curl git openssh-server -y

### Setting up user "poly" as a superuser
USER root
RUN apt install -y sudo
#password is poly123 $(openssl passwd -crypt 'poly123')
RUN useradd -p 'eUmh6grmrNqTg' --shell /bin/bash -m poly
RUN usermod -aG sudo poly
RUN echo "poly     ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
RUN echo "ListenAddress 0.0.0.0" >> /etc/ssh/sshd_config

### Setting up nodejs and npm
USER root
RUN curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
RUN apt update && apt install -y nodejs

### Setting up project files 
USER poly
RUN mkdir /home/poly/jitsi-poly
# COPY --chown=poly . /home/poly/jitsi-poly

### Setting up entry interfaces
EXPOSE 8080
EXPOSE 22
WORKDIR /home/poly/jitsi-poly
USER poly

ENTRYPOINT ["/bin/bash", "-c", "sudo service ssh restart && sleep infinity"]