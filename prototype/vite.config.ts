import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'../book',emptyOutDir:true,target:'es2022'},server:{host:'127.0.0.1',port:8767}});
