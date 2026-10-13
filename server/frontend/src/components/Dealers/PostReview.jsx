import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import "./Dealers.css";
import "../assets/style.css";
import Header from '../Header/Header';


const PostReview = () => {
  const [dealer, setDealer] = useState({});
  const [review, setReview] = useState("");
  const [purchase, setPurchase] = useState(true);
  const [model, setModel] = useState();
  const [year, setYear] = useState("");
  const [date, setDate] = useState("");
  const [carmodels, setCarmodels] = useState([]);

  let root_url = window.location.origin + '/';
  let params = useParams();
  let id =params.id;
  let dealer_url = root_url+`djangoapp/dealer/${id}`;
  let review_url = root_url+`djangoapp/add_review`;
  let carmodels_url = root_url+`djangoapp/get_cars`;

  const postreview = async ()=>{
    let name = sessionStorage.getItem("firstname")+" "+sessionStorage.getItem("lastname");
    //If the first and second name are stores as null, use the username
    if(name.includes("null")) {
      name = sessionStorage.getItem("username");
    }
    if(!model || review === "" || date === "" || year === "" || model === "") {
      alert("All details are mandatory")
      return;
    }

    if (!Number.isInteger(Number(year)) || Number(year) < 2015 || Number(year) > 2023) {
      alert('Choose a car year from 2015 through 2023');
      return;
    }
    let make_chosen = model.CarMake;
    let model_chosen = model.CarModel;

    let jsoninput = JSON.stringify({
      "name": name,
      "dealership": id,
      "review": review,
      "purchase": purchase,
      "purchase_date": date,
      "car_make": make_chosen,
      "car_model": model_chosen,
      "car_year": year,
    });

    console.log(jsoninput);
    const res = await fetch(review_url, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: jsoninput,
  });

  const json = await res.json();
  if (json.status === 200) {
      window.location.href = window.location.origin+"/dealer/"+id;
  }

  }
  const get_dealer = useCallback(async ()=>{
    const res = await fetch(dealer_url, {
      method: "GET"
    });
    const retobj = await res.json();
    
    if(retobj.status === 200) {
      let dealerobjs = Array.from(retobj.dealer)
      if(dealerobjs.length > 0)
        setDealer(dealerobjs[0])
    }
  },[dealer_url]);

  const get_cars = useCallback(async ()=>{
    const res = await fetch(carmodels_url, {
      method: "GET"
    });
    const retobj = await res.json();
    
    let carmodelsarr = Array.from(retobj.CarModels)
    setCarmodels(carmodelsarr)
  },[carmodels_url]);
  useEffect(() => {
    get_dealer();
    get_cars();
  },[get_dealer, get_cars]);


  return (
    <div>
      <Header/>
      <div  style={{margin:"5%"}}>
      <h1 style={{color:"darkblue"}}>{dealer.full_name}</h1>
      <label htmlFor="review">Your Review</label><br/>
      <textarea id='review' cols='50' rows='7' onChange={(e) => setReview(e.target.value)}></textarea>
      <div><label><input type="checkbox" checked={purchase} onChange={e=>setPurchase(e.target.checked)}/> I purchased a car from this dealer</label></div>
      <div className='input_field'>
      Purchase Date <input type="date" onChange={(e) => setDate(e.target.value)}/>
      </div>
      <div className='input_field'>
      Car Make 
      <select name="cars" id="cars" defaultValue="" onChange={(e) => setModel(JSON.parse(e.target.value))}>
      <option value="" disabled hidden>Choose Car Make and Model</option>
      {carmodels.map(carmodel => (
          <option key={carmodel.CarMake+" "+carmodel.CarModel} value={JSON.stringify(carmodel)}>{carmodel.CarMake} {carmodel.CarModel}</option>
      ))}
      </select>        
      </div >

      <div className='input_field'>
      Car Year <input type="number" step="1" onChange={(e) => setYear(e.target.value)} max={2023} min={2015}/>
      </div>

      <div>
      <button className='postreview' onClick={postreview}>Post Review</button>
      </div>
    </div>
    </div>
  )
}
export default PostReview
