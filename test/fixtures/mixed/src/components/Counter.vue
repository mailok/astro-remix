<script setup>import { ref } from 'vue'; const count = ref(0);</script>
<template><section data-framework="vue"><output>{{ count }}</output><button type="button" @click="count++">Increment</button></section></template>
