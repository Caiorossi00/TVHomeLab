# TVHomeLab

Projeto experimental para desenvolver e validar uma interface de Home personalizada
para Android TV, utilizando uma Activity nativa em Kotlin e uma interface local
renderizada em WebView.

## Objetivo

- Validar a renderização de HTML e CSS na televisão.
- Medir o viewport CSS e o devicePixelRatio.
- Investigar a navegação utilizando o controle remoto.
- Preparar uma interface minimalista para Android TV.

## Tecnologias

- Kotlin
- Android SDK
- Android WebView
- HTML, CSS e JavaScript
- Gradle

## Requisitos

- JDK 17 ou superior compatível com a configuração do projeto.
- Android SDK.
- Gradle 8.9.

## Compilar

Na raiz do projeto, execute:

    gradle assembleDebug

Se o Gradle não estiver no PATH, utilize o caminho da instalação local:

    ~/.local/opt/gradle-8.9/bin/gradle assembleDebug --no-daemon

O APK de depuração será gerado em:

    app/build/outputs/apk/debug/app-debug.apk

## Instalar em uma Android TV conectada por ADB

    adb install -r app/build/outputs/apk/debug/app-debug.apk

Para abrir a aplicação:

    adb shell am start -n br.com.caio.tvhomelab/.MainActivity

## Observações

O projeto está em fase experimental. A aplicação é instalada como um app
Android comum e não substitui automaticamente o launcher padrão da televisão.
