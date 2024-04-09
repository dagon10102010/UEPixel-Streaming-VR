cd SignallingWebServer
start node cirrus.js --streamerPort 9983 --httpPort 9998
start node cirrus.js --streamerPort 9984 --httpPort 9999
cd ..
cd Windows
start TP_ThirdPerson.exe -AudioMixer -PixelStreamingIP=localhost -PixelStreamingPort=9983 -WinX=0 -WinY=0 -ResX=960 -ResY=1080 -Windowed -RenderOffScreen -ForceRes -NvEncFrameRateNum=1 -eye=left
start TP_ThirdPerson.exe -AudioMixer -PixelStreamingIP=localhost -PixelStreamingPort=9984 -WinX=0 -WinY=0 -ResX=960 -ResY=1080 -Windowed -RenderOffScreen -ForceRes -NvEncFrameRateNum=1 -eye=right
cd ..

cd webvr
npx vite --host --port 8080
