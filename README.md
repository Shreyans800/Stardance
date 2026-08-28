# Rocket Orbit Simulator
Hi, Welcome!
This is an interactive rocket trajectory simulator built with HTML, CSS, and Java.

TRY IT!

https://shreyans800.github.io/Stardance

##  Features
Well, I thought about what I actually wanted to put in the simulation and came up with these:

  Parameters:
- Engine thrust calculation
- Specific impulse and mass flow rate
- Fuel consumption and changing rocket mass
- Atmospheric density, pressure, and temperature
- Atmospheric drag
- 
  Also Included:
- Graphs (mathematical aspect!)
- A guide as to how the simulation works

  
The simulation accounts for:   (Yes, you can edit these!)

- Thrust
- Specific impulse
- Propellant mass flow
- Changing vehicle mass
- Atmospheric drag
- Atmospheric density
- Gravity variation with altitude
- Orbital velocity

## What does it do?

The simulator gives a 2D demo of what the rocket's trajectory would look like.
Please note that it is NOT accurate, and whilst I tried to include some variables, providing an actual path is not possible.
Also, you can see what result it would give if something changed.

# How Was It Built

This was quite a journey. Firstly, I studied the major variables(except drag) and found that it was similar to projectile motion, which eventually became the basis for the simulation. The only difficulty was using Plotly and Base64 and IO for the simulation, and also integrating it with Java frame-by-frame motions. (Yes, a continuous  pre-built video-like projection would not work, so I had to make it move >16 FPS). The drag insertion in the calculations was solved by YouTube videos (Thanks, Google!) and pretty much that's it. 
Also, since I had this week off, I put all my time into it (quite literally), and 
mainly the coding was not so difficult because we actually learnt these languages back in 10th grade. Also for physics... I used
 Wikipedia and the NASA Goddard website for the small technical details alongside the NCERT Physics Textbook (Class11 - Projectile Motion)
 Do enjoy adjusting different variables to see the results change!

  

