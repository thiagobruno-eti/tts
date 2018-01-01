# Character API TTS Sample
HTML 5 Talking Avatar using Character API and AWS Polly

## Overview
This is a sample project for the [Character API](https://aws.amazon.com/marketplace/pp/B06ZY1VBFZ), a RESTful, cloud-based Character Animation API available on the Amazon AWS Marketplace.
For a detailed introduction to the Character API, please read the [Character API Tutorial](https://www.mediasemantics.com/apitutorial.html). 
A variant of this sample can be seen [here](https://www.mediasemantics.com/samplestts.html). 
In order to run this sample on your own website, you will need API keys and access to a web server. 

Use the [Character API](https://aws.amazon.com/marketplace/pp/B06ZY1VBFZ) page to add the
Character API service to your AWS account. You will receive codes by email that you will insert in the provided sample code, and you will be charged $0.007 per call to the Character API. Charges
appear on your monthly AWS bill. 

This sample also uses the Amazon Polly Text-to-Speech API, which is priced based on usage, with a free tier of up to 5 million characters per month. 

Since this sample caches the API results, API fees are only incurred for text that has not already been seen, so your actual spend depends on your traffic and on the effectiveness of the cache.

## Preparing an instance
This guide assumes that you already have access to an AWS EC2 instance with Apache and Node.js installed. If you are creating a new instance, then a free-tier-eligible "t2.micro" instance 
provides ample horsepower. Relevant AWS tutorials include 
<a href="http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-LAMP.html">Tutorial: Install a LAMP Web Server with the Amazon Linux AMI</a> (only the apache step is required for this sample) and 
<a href="http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-up-node-on-ec2-instance.html">Tutorial: Setting Up Node.js on an Amazon EC2 Instance</a>.
For brevity, a simple installation on a clean EC2 instance with the standard AWS AMI is described. However these instructions can easily be adapted to other environments, including Ubuntu. Please
see the [Character API Tutorial](https://www.mediasemantics.com/apitutorial.html) for more details.

## Obtaining keys
The Character API access key is the 8-digit key that is mailed to you when you add the Character API to your AWS account. 

To access the AWS Polly Text-to-Speech service, you will want to create an IAM User for your app. On the AWS Console, go to the IAM service and click Add User. You might call the user "tts".
Select the "Programmatic access" checkbox and click Next. Click "Attach existing policies directly". In the Policy Type search box, enter "polly", then check the box beside AmazonPollyFullAccess. Click Next.
Review the details, then click "Create user". On the next screen, you will want to copy two keys. The Access key ID is a string of capitalized alphanumeric characters, and the Secret Access Key is longer string
of mixed-case characters. Make sure you record both values, as you will need to insert them into the sample.

## Installing the server component
Install the sample in the a directory on the serve, e.g. the home directory:
```
cd ~
git clone https://github.com/mediasemantics/tts.git
cd tts
```

Install the required dependencies:
```
npm update
```

Create a cache subdirectory with the write permissions:
```
mkdir cache
sudo chgrp apache cache
sudo chmod g+w cache
```

Modify the tts.js file to add your Character API and AWS Polly access credentials.
```
nano tts.js
```
Replace '11111111' with the 8 digit key that was mailed to you when you signed up for the Character API.

Replace 'POLLYACCESSKEY' and 'pollysecretkey' with the values obtained when you created the 'tts' IAM user.

Save your changes.

The client expects to call the server using HTTP GET request at the url "/tts/animate.jpeg". 
To make the mapping, you can add a ProxyPass entry in your Apache config file.
```
sudo nano /etc/httpd/conf/httpd.conf
```
At the end of the file, add the line:
```
ProxyPass /tts http://localhost:3000
```
Then restart apache with
```
$ sudo service httpd restart
```
You can now start the server with:
```
node tts.js
```
You should see "Listening on port 3000". If you receive an EADDRINUSE exception then you can adjust the port used in the app.listen() call at the end of tts.js, but then remember to change it also in the ProxyPass statement above.
Please see the Character API tutorial to learn how you can use "pm2" to automatically start your Node.js API server when your instance reboots.

You can verify that the caching server app is working by viewing this URL from a web browser:
```
http://nn.nn.nn.nn/tts/animate.jpeg
```
Substitute the ip address of your instance for 'nn.nn.nn.nn'. Note that animate.jpeg is NOT a static image, but the name of the endpoint serviced by tts.js - the ".jpeg" extension is helpful in communicating
the file type produced. If all goes well, you should see a character texture map image appear.


## Installing the client component

The client component of the sample is located in the html subdirectory. You can copy this to your apache root directory with:
```
cp tts/html/* /var/www/html
```
You can then run the sample at:
```
http://nn.nn.nn.nn/tts.html
```
The client uses Pixi.js and some simple javascript code to create an animated character. The character acts like a puppet. Without any input, it has an "idle" behavior (it blinks periodically). You can prompt it to say different things by invoking the animateSpeakQueued() function.

The string to be spoken can include XML action tags, such as &lt;lookleft/&gt; and &lt;cmd/&gt;. The animateStop() function smoothly stops any action and returns the character to the default state. 

Several strings can be queued up for playback. If you have a lot of text to play,
then it is recommended that you break it up into multiple animateSpeakQueued() calls of one sentence each. This allows the synthesis to be performed a little at a time, so the user can 
begin listening with minimal delay. If the user stops the playback early then only a fraction of the text need be generated. 



