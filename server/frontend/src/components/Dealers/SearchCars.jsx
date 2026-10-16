import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../Header/Header';

const defaultFilters = { make: 'all', model: 'all', year: 'all', mileage: 'all', price: 'all' };

const inBucket = (value, selected, cutoffs) => {
  if (selected === 'all') return true;
  const upper = Number(selected);
  const index = cutoffs.indexOf(upper);
  return index === -1
    ? value > cutoffs[cutoffs.length - 1]
    : value <= upper && (index === 0 || value > cutoffs[index - 1]);
};

const applyFilters = (cars, filters) => cars.filter((car) =>
  (filters.make === 'all' || car.make === filters.make) &&
  (filters.model === 'all' || car.model === filters.model) &&
  (filters.year === 'all' || car.year >= Number(filters.year)) &&
  inBucket(car.mileage, filters.mileage, [50000, 100000, 150000, 200000]) &&
  inBucket(car.price, filters.price, [20000, 40000, 60000, 80000])
);

const SearchCars = () => {
  const [cars, setCars] = useState([]);
  const [allCars, setAllCars] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [dealer, setDealer] = useState({ full_name: '' });
  const [dealerMessage, setDealerMessage] = useState('');
  const [message, setMessage] = useState('Loading cars...');
  const [filters, setFilters] = useState(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const lifecycleRequest = useRef(0);
  const searchRequest = useRef(0);
  const { id } = useParams();

  const populateMakesAndModels = (items) => {
    setMakes([...new Set(items.map((car) => car.make))].sort());
    setModels([...new Set(items.map((car) => car.model))].sort());
  };

  const search = async (name, value) => {
    const lifecycleId = lifecycleRequest.current;
    const requestId = ++searchRequest.current;
    const nextFilters = { ...filters, [name]: value };
    setFilters(nextFilters);
    const query = value === 'all' ? '' : `?${name}=${encodeURIComponent(value)}`;
    try {
      const response = await fetch(`/djangoapp/get_inventory/${id}${query}`);
      const result = await response.json();
      if (!response.ok || result.status !== 200) throw new Error('Unable to filter inventory');
      if (lifecycleId !== lifecycleRequest.current || requestId !== searchRequest.current) return;
      const matching = applyFilters(Array.from(result.cars || []), nextFilters);
      setCars(matching);
      setMessage(matching.length ? '' : 'No cars found matching criteria');
    } catch (error) {
      if (lifecycleId !== lifecycleRequest.current || requestId !== searchRequest.current) return;
      setCars([]);
      setMessage(error.message);
    }
  };

  const SearchCarsByMake = (event) => search('make', event.target.value);
  const SearchCarsByModel = (event) => search('model', event.target.value);
  const SearchCarsByYear = (event) => search('year', event.target.value);
  const SearchCarsByMileage = (event) => search('mileage', event.target.value);
  const SearchCarsByPrice = (event) => search('price', event.target.value);

  const reset = () => {
    searchRequest.current += 1;
    setFilters(defaultFilters);
    setCars(allCars);
    setMessage(allCars.length ? '' : 'No cars found');
  };

  useEffect(() => {
    const lifecycleId = ++lifecycleRequest.current;
    searchRequest.current += 1;
    setFilters(defaultFilters);
    setCars([]);
    setAllCars([]);
    setMakes([]);
    setModels([]);
    setDealer({ full_name: '' });
    setMessage('Loading cars...');
    setDealerMessage('');
    setIsLoading(true);

    const loadCars = async () => {
      try {
        const response = await fetch(`/djangoapp/get_inventory/${id}`);
        const result = await response.json();
        if (!response.ok || result.status !== 200) throw new Error('Unable to load inventory');
        if (lifecycleId !== lifecycleRequest.current) return;
        const items = Array.from(result.cars || []);
        setAllCars(items);
        setCars(items);
        populateMakesAndModels(items);
        setMessage(items.length ? '' : 'No cars found');
        setIsLoading(false);
      } catch (error) {
        if (lifecycleId === lifecycleRequest.current) {
          setMessage(error.message);
          setIsLoading(false);
        }
      }
    };

    const loadDealer = async () => {
      try {
        const response = await fetch(`/djangoapp/dealer/${id}`);
        const result = await response.json();
        if (!response.ok || result.status !== 200 || !result.dealer?.length) {
          throw new Error('Unable to load dealer');
        }
        if (lifecycleId === lifecycleRequest.current) {
          setDealer({ full_name: result.dealer[0].full_name });
        }
      } catch (error) {
        if (lifecycleId === lifecycleRequest.current) setDealerMessage(error.message);
      }
    };

    loadCars();
    loadDealer();
    return () => {
      if (lifecycleId === lifecycleRequest.current) lifecycleRequest.current += 1;
      searchRequest.current += 1;
    };
  }, [id]);

  const selectStyle = { margin: '0 10px', padding: '6px 10px', borderRadius: '10px' };
  return (
    <div>
      <Header />
      <h1 style={{ marginBottom: '20px' }}>Cars at {dealer.full_name}</h1>
      {dealerMessage && <p role="alert">{dealerMessage}</p>}
      <div>
        <label>Make
          <select aria-label="Make" style={selectStyle} value={filters.make} onChange={SearchCarsByMake} disabled={isLoading}>
            <option value="all">-- All --</option>
            {makes.map((make) => <option key={make} value={make}>{make}</option>)}
          </select>
        </label>
        <label>Model
          <select aria-label="Model" style={selectStyle} value={filters.model} onChange={SearchCarsByModel} disabled={isLoading}>
            <option value="all">-- All --</option>
            {models.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </label>
        <label>Year
          <select aria-label="Year" style={selectStyle} value={filters.year} onChange={SearchCarsByYear} disabled={isLoading}>
            <option value="all">-- All --</option>
            {[2024, 2023, 2022, 2021, 2020].map((year) => <option key={year} value={year}>{year} or newer</option>)}
          </select>
        </label>
        <label>Mileage
          <select aria-label="Mileage" style={selectStyle} value={filters.mileage} onChange={SearchCarsByMileage} disabled={isLoading}>
            <option value="all">-- All --</option>
            <option value="50000">Up to 50,000</option><option value="100000">50,001–100,000</option>
            <option value="150000">100,001–150,000</option><option value="200000">150,001–200,000</option>
            <option value="200001">Over 200,000</option>
          </select>
        </label>
        <label>Price
          <select aria-label="Price" style={selectStyle} value={filters.price} onChange={SearchCarsByPrice} disabled={isLoading}>
            <option value="all">-- All --</option>
            <option value="20000">Up to $20,000</option><option value="40000">$20,001–$40,000</option>
            <option value="60000">$40,001–$60,000</option><option value="80000">$60,001–$80,000</option>
            <option value="80001">Over $80,000</option>
          </select>
        </label>
        <button type="button" onClick={reset} disabled={isLoading}>Reset</button>
      </div>
      <div style={{ margin: '20px 10px' }}>
        {!cars.length ? <p>{message}</p> : cars.map((car) => (
          <div key={car._id || `${car.dealer_id}-${car.make}-${car.model}-${car.year}-${car.mileage}`}>
            <hr /><h3>{car.make} {car.model}</h3>
            <p>Body type: {car.bodyType}</p><p>Year: {car.year}</p>
            <p>Mileage: {car.mileage}</p><p>Price: ${Number(car.price).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export { applyFilters, inBucket };
export default SearchCars;
