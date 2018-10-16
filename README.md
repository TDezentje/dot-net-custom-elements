# Rendering custom elements with C#

This is a proof of concept to render custom elements within C#.
The code needed to render the elements is transpiled to C# with the dotnet.transform.ts

## Requirements
* Node.js
* .NET Core

## How to build
Go to /client

```
cd client
run npm install
run npm build
```

This builds the front-end code and generates the C# code.
Now lets run the back-end:

```
cd server
dotnet restore
dotnet run
```