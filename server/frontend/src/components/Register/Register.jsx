import React, { useState } from 'react';
import Header from '../Header/Header';
import './Register.css';

export default function Register() {
  const [form, setForm] = useState({userName:'', firstName:'', lastName:'', email:'', password:''});
  const [error, setError] = useState('');
  async function register(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch('/djangoapp/register', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'Authenticated') throw new Error(data.error || 'Registration failed');
      sessionStorage.setItem('username', data.userName);
      sessionStorage.setItem('firstname', form.firstName);
      sessionStorage.setItem('lastname', form.lastName);
      window.location.href = '/';
    } catch (err) { setError(err.message); }
  }
  return <><Header/><main className="register_container" style={{maxWidth:600,margin:'32px auto',padding:24}}>
    <h1>Sign Up</h1><p>Create your Best Cars account to write dealership reviews.</p>
    {error && <p role="alert">{error}</p>}<form onSubmit={register}>
      {Object.entries({userName:'Username',firstName:'First Name',lastName:'Last Name',email:'Email',password:'Password'}).map(([key,label]) =>
        <div key={key} style={{marginBottom:16}}><label htmlFor={key}>{label}</label>
          <input id={key} name={key} className="form-control" placeholder={label} required
            type={key==='password'?'password':key==='email'?'email':'text'} value={form[key]}
            autoComplete={key==='password'?'new-password':key==='userName'?'username':key==='email'?'email':'off'}
            onChange={e=>setForm({...form,[key]:e.target.value})}/></div>)}
      <button className="btn btn-primary" type="submit">Register</button>
    </form></main></>;
}
