# HuluXtream - IPTV Player App

A powerful IPTV player app built with React Native + Expo, featuring a clean, modern UI inspired by Hulu, and supporting Xtream Codes API.

## Features

- **Xtream Codes API Integration**: Login with username, password, and server URL
- **Modern UI**: Hulu-inspired interface with dark theme and elegant design
- **Content Organization**: Live TV, Movies (VOD), Series with categories
- **Media Playback**: Integrated VLC Player supporting various formats
- **Content Discovery**: Featured content, categories, and search functionality
- **Performance**: Offline caching for faster content reload

## Screenshots

_(Screenshots will be added here once the app is fully tested)_

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/huluxtream.git
cd huluxtream
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Use the Expo Go app on your device to scan the QR code, or run on a simulator/emulator:
```bash
npm run ios     # for iOS
npm run android # for Android
```

## Authentication

HuluXtream uses Xtream Codes API for authentication. You'll need to obtain the following from your IPTV provider:

- Username
- Password
- Server URL (in the format: http://example.com:port)

## Build & Deploy

### For Android:

```bash
expo build:android
```

### For iOS:

```bash
expo build:ios
```

## Development

This project uses:

- React Native with Expo
- TypeScript for type safety
- Expo Router for navigation
- VLC Player for media playback
- Context API for state management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Disclaimer

This application is intended for educational purposes and for use with legally obtained IPTV subscriptions. The developers of this application do not host or distribute any content. Users are responsible for ensuring they have the necessary rights to access and view content through their IPTV provider.
