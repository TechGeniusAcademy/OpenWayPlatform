import { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

function QuillEditor({ value, onChange, modules, placeholder }) {
  const quillRef = useRef(null);

  useEffect(() => {
    // Подавляем предупреждение findDOMNode
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('findDOMNode')
      ) {
        return;
      }
      originalError.call(console, ...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <ReactQuill
      ref={quillRef}
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder}
      theme="snow"
    />
  );
}

export default QuillEditor;
