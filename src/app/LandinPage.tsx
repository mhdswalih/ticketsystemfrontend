import React, { useEffect, useState } from 'react';
import { X, Loader2, RefreshCw, Users, User } from 'lucide-react';

interface Seat {
  id: number;
  row: string;
  number: number;
  status: 'available' | 'booked';
  selectedBy: string | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  payment: string;
}

interface BookedUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  payment: string;
  seatBooked: boolean;
  seatId: number;
  createdAt: string;
}

const TheaterTicketSystem: React.FC = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedUsers, setBookedUsers] = useState<BookedUser[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    payment: 'card'
  });

  // Generate initial 80 seats
  const generateAllSeats = (): Seat[] => {
    const allSeats: Seat[] = [];
    for (let i = 0; i < 80; i++) {
      allSeats.push({
        id: i,
        row: String.fromCharCode(65 + Math.floor(i / 10)),
        number: (i % 10) + 1,
        status: 'available',
        selectedBy: null
      });
    }
    return allSeats;
  };

  // Mark seats as booked based on bookedUsers data
  const markBookedSeats = (allSeats: Seat[], users: BookedUser[]): Seat[] => {
    const updatedSeats = [...allSeats];
    
    users.forEach(user => {
      if (user.seatBooked && user.seatId !== undefined) {
        const seatIndex = updatedSeats.findIndex(seat => seat.id === user.seatId);
        if (seatIndex !== -1) {
          updatedSeats[seatIndex] = {
            ...updatedSeats[seatIndex],
            status: 'booked',
            selectedBy: user.name
          };
        }
      }
    });
    
    return updatedSeats;
  };

  const handleSeatClick = (seat: Seat): void => {
    if (seat.status !== 'available') {
      // If seat is booked, show who booked it
      if (seat.selectedBy) {
        alert(`This seat (${seat.row}${seat.number}) is already booked by ${seat.selectedBy}`);
      }
      return;
    }

    console.log('Seat clicked:', seat);
    setSelectedSeat(seat);
    setShowModal(true);
  };

  const fetchData = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('Fetching data from backend...');
      
      // First, get all users (bookings)
      const response = await fetch('http://localhost:3000/get-bookings');
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Bookings data:', data);
      
      // Handle different response structures
      let usersData: BookedUser[];
      if (Array.isArray(data)) {
        usersData = data;
      } else if (data.data && Array.isArray(data.data)) {
        usersData = data.data;
      } else if (data.users && Array.isArray(data.users)) {
        usersData = data.users;
      } else {
        console.warn('Unexpected response format, using empty array');
        usersData = [];
      }
      
      // Filter only users who have booked seats
      const bookedUsersData = usersData.filter(user => user.seatBooked);
      setBookedUsers(bookedUsersData);
      console.log('Booked users:', bookedUsersData);
      
      // Generate all 80 seats
      const allSeats = generateAllSeats();
      
      // Mark seats as booked based on user data
      const seatsWithBookings = markBookedSeats(allSeats, bookedUsersData);
      
      setSeats(seatsWithBookings);
      console.log('Total seats after marking:', seatsWithBookings.length);
      console.log('Booked seats count:', seatsWithBookings.filter(s => s.status === 'booked').length);
      
      setError(null);
      
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load seat data. Using demo data instead.');
      // Use generated seats as fallback
      setSeats(generateAllSeats());
      setBookedUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleConfirmBooking = async (): Promise<void> => {
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please fill all fields');
      return;
    }

    if (!selectedSeat) {
      alert('No seat selected');
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        payment: formData.payment,
        seatBooked: true,
        seatId: selectedSeat.id
      };

      console.log('Sending booking data:', bookingData);
      
      const response = await fetch('http://localhost:3000/confirm-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to confirm booking: ${errorText}`);
      }

      const data = await response.json();
      console.log('Booking confirmed:', data);

      // Update local state
      const updatedSeats = seats.map(s =>
        s.id === selectedSeat?.id
          ? { ...s, status: 'booked' as const, selectedBy: formData.name }
          : s
      );
      setSeats(updatedSeats);
      
      // Add to booked users list
      const newBookedUser: BookedUser = {
        _id: data._id || Date.now().toString(),
        ...bookingData,
        createdAt: new Date().toISOString()
      };
      setBookedUsers(prev => [...prev, newBookedUser]);
      
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', payment: 'card' });
      setSelectedSeat(null);
      
      alert(`🎉 Ticket booked successfully for ${formData.name}! Seat: ${selectedSeat.row}${selectedSeat.number}`);
      
      // Refresh data from server to ensure consistency
      setTimeout(() => fetchData(), 500);
      
    } catch (err: any) {
      console.error('Error confirming booking:', err);
      alert(`Failed to confirm booking: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleCloseModal = (): void => {
    if (loading) return;
    setShowModal(false);
    setFormData({ name: '', email: '', phone: '', payment: 'card' });
    setSelectedSeat(null);
    setError(null);
  };

  const rows: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const bookedSeats = seats.filter(seat => seat.status === 'booked');
  const availableSeats = seats.filter(seat => seat.status === 'available');

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* Header with Refresh Button */}
        <div className='text-center mb-8'>
          <div className='flex justify-between items-center mb-4'>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className='flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50'
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            
            <div className='text-right'>
              <p className='text-gray-300 text-sm'>Total Seats: {seats.length}</p>
              <p className='text-gray-300 text-sm'>Available: <span className='text-emerald-400'>{availableSeats.length}</span></p>
              <p className='text-gray-300 text-sm'>Booked: <span className='text-red-400'>{bookedSeats.length}</span></p>
            </div>
          </div>
          
          <h1 className='text-3xl md:text-5xl font-bold text-white mb-2'>🎭 Theater Booking System</h1>
          <p className='text-gray-400'>Select available seats (green) and book your tickets</p>
          
          {error && (
            <div className='mt-4 bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-lg inline-block'>
              {error}
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className='mb-6 bg-slate-800 rounded-lg p-4 text-sm'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
              <span className='text-gray-300'>Backend: {loading ? 'Loading...' : 'Connected'}</span>
            </div>
            <div className='text-gray-400'>
              <span className='flex items-center gap-1'>
                <Users size={14} />
                {bookedUsers.length} bookings
              </span>
            </div>
          </div>
        </div>

        {/* Screen */}
        <div className='text-center mb-8'>
          <div className='inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold py-3 px-8 md:px-12 rounded-full text-lg'>
            🎬 SCREEN 🎬
          </div>
          <p className='text-gray-400 mt-2 text-sm'>All eyes here during the show!</p>
        </div>

        {/* Seats Grid */}
        {loading && !refreshing ? (
          <div className='flex flex-col items-center justify-center py-20'>
            <Loader2 className='w-12 h-12 text-cyan-400 animate-spin mb-4' />
            <p className='text-white text-lg'>Loading seat data...</p>
            <p className='text-gray-400 text-sm mt-2'>Fetching from backend server</p>
          </div>
        ) : (
          <>
            <div className='flex justify-center mb-8'>
              <div className='bg-slate-700 rounded-xl p-4 md:p-8 w-full max-w-4xl'>
                {rows.map(row => {
                  const rowSeats = seats.filter(seat => seat.row === row);
                  if (rowSeats.length === 0) return null;
                  
                  return (
                    <div key={row} className='flex gap-3 mb-4 items-center justify-center'>
                      <span className='w-6 md:w-8 text-gray-300 font-bold text-center'>{row}</span>
                      <div className='flex gap-1 md:gap-2 flex-wrap justify-center'>
                        {rowSeats.map(seat => {
                          const isBooked = seat.status === 'booked';
                          const isSelected = selectedSeat?.id === seat.id;
                          
                          return (
                            <button
                              key={seat.id}
                              onClick={() => handleSeatClick(seat)}
                              disabled={isBooked || loading}
                              className={`
                                w-8 h-8 md:w-10 md:h-10 
                                rounded transition-all transform 
                                font-semibold text-xs md:text-sm 
                                flex items-center justify-center
                                ${isBooked 
                                  ? 'bg-red-600 text-white cursor-not-allowed shadow-lg shadow-red-500/30' 
                                  : isSelected
                                    ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-500/50 hover:scale-110'
                                    : 'bg-emerald-500 text-white hover:bg-emerald-400 hover:scale-110'
                                }
                              `}
                              title={
                                isBooked 
                                  ? `Booked by: ${seat.selectedBy || 'Someone'}\nSeat: ${seat.row}${seat.number}` 
                                  : `Available: ${seat.row}${seat.number}\nClick to select`
                              }
                            >
                              {seat.number}
                              {isBooked && (
                                <span className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full'></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className='flex justify-center gap-6 mb-8 flex-wrap'>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 md:w-8 md:h-8 bg-emerald-500 rounded'></div>
                <span className='text-gray-300 text-sm md:text-base'>Available</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 md:w-8 md:h-8 bg-red-600 rounded'></div>
                <span className='text-gray-300 text-sm md:text-base'>Booked</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-6 h-6 md:w-8 md:h-8 bg-cyan-400 rounded'></div>
                <span className='text-gray-300 text-sm md:text-base'>Selected</span>
              </div>
            </div>

            {/* Stats */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
              <div className='bg-slate-700 rounded-lg p-4 text-center'>
                <p className='text-gray-400 text-sm'>Total Capacity</p>
                <p className='text-2xl font-bold text-white'>{seats.length}</p>
              </div>
              <div className='bg-slate-700 rounded-lg p-4 text-center border border-emerald-500/30'>
                <p className='text-gray-400 text-sm'>Available Seats</p>
                <p className='text-3xl font-bold text-emerald-400'>{availableSeats.length}</p>
              </div>
              <div className='bg-slate-700 rounded-lg p-4 text-center border border-red-500/30'>
                <p className='text-gray-400 text-sm'>Booked Seats</p>
                <p className='text-3xl font-bold text-red-400'>{bookedSeats.length}</p>
              </div>
            </div>

            {/* Selected Seat Info */}
            {selectedSeat && (
              <div className='text-center text-white mb-8'>
                <div className='inline-block bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg p-6 border border-cyan-500/50'>
                  <p className='text-gray-400'>You are booking</p>
                  <p className='text-4xl font-bold text-cyan-400'>
                    {selectedSeat.row}{selectedSeat.number}
                  </p>
                  <p className='text-gray-300 mt-2'>Price: <span className='font-bold text-yellow-400'>$12.99</span></p>
                  <p className='text-emerald-400 text-sm mt-2'>✅ This seat is available!</p>
                </div>
              </div>
            )}

            {/* Booked Seats Details */}
            {bookedUsers.length > 0 && (
              <div className='bg-slate-800 rounded-xl p-6 mb-8 border border-red-500/20'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-xl font-bold text-white flex items-center gap-2'>
                    <User size={20} />
                    Booked Seats ({bookedSeats.length})
                  </h3>
                  <span className='text-gray-400 text-sm'>Updated: {new Date().toLocaleTimeString()}</span>
                </div>
                
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {bookedUsers.map(user => {
                    const seat = seats.find(s => s.id === user.seatId);
                    return (
                      <div
                        key={user._id}
                        className='bg-slate-700 rounded-lg p-4 border border-red-500/30 hover:border-red-500/50 transition'
                      >
                        <div className='flex justify-between items-start mb-2'>
                          <div>
                            <p className='text-red-400 font-bold text-lg'>{seat?.row}{seat?.number}</p>
                            <p className='text-white font-semibold'>{user.name}</p>
                          </div>
                          <span className='text-xs text-gray-400 bg-slate-800 px-2 py-1 rounded'>
                            {user.payment}
                          </span>
                        </div>
                        <div className='text-gray-400 text-sm'>
                          <p className='truncate'>{user.email}</p>
                          <p>{user.phone}</p>
                          <p className='text-gray-500 text-xs mt-2'>
                            Booked on {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Modal */}
      {showModal && selectedSeat && (
        <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50'>
          <div className='bg-slate-800 rounded-xl max-w-md w-full p-6 md:p-8 border border-slate-700 shadow-2xl'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-2xl font-bold text-white'>Confirm Booking</h2>
              <button
                onClick={handleCloseModal}
                disabled={loading}
                className='text-gray-400 hover:text-white transition disabled:opacity-50 hover:bg-slate-700 p-1 rounded-full'
              >
                <X size={24} />
              </button>
            </div>

            {/* Seat Info */}
            <div className='bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg p-4 mb-6 text-white border border-cyan-500/50'>
              <div className='flex justify-between items-center'>
                <div>
                  <p className='text-sm text-gray-300'>Seat Number</p>
                  <p className='text-3xl font-bold text-cyan-400'>
                    {selectedSeat.row}{selectedSeat.number}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm text-gray-300'>Price</p>
                  <p className='text-2xl font-bold text-yellow-400'>$12.99</p>
                </div>
              </div>
              <p className='text-emerald-400 text-sm mt-3 flex items-center gap-1'>
                <span className='w-2 h-2 bg-emerald-400 rounded-full'></span>
                This seat is available for booking
              </p>
            </div>

            {/* Form */}
            <div className='space-y-4 mb-6'>
              <div>
                <label className='block text-gray-300 text-sm font-semibold mb-2'>
                  Full Name <span className='text-red-400'>*</span>
                </label>
                <input
                  type='text'
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={loading}
                  className='w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-50'
                  placeholder='John Doe'
                  required
                />
              </div>

              <div>
                <label className='block text-gray-300 text-sm font-semibold mb-2'>
                  Email <span className='text-red-400'>*</span>
                </label>
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading}
                  className='w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-50'
                  placeholder='john@example.com'
                  required
                />
              </div>

              <div>
                <label className='block text-gray-300 text-sm font-semibold mb-2'>
                  Phone <span className='text-red-400'>*</span>
                </label>
                <input
                  type='tel'
                  name='phone'
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={loading}
                  className='w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-50'
                  placeholder='+1 (555) 123-4567'
                  required
                />
              </div>

              <div>
                <label className='block text-gray-300 text-sm font-semibold mb-2'>
                  Payment Method
                </label>
                <select
                  name='payment'
                  value={formData.payment}
                  onChange={handleInputChange}
                  disabled={loading}
                  className='w-full bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-cyan-400 focus:outline-none disabled:opacity-50'
                >
                  <option value='card'>💳 Credit/Debit Card</option>
                  <option value='upi'>📱 UPI</option>
                  <option value='wallet'>👛 Digital Wallet</option>
                  <option value='cash'>💵 Cash at Venue</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex gap-3'>
              <button
                onClick={handleCloseModal}
                disabled={loading}
                className='flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2'
              >
                <X size={18} />
                Cancel
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={loading}
                className='flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white py-3 rounded-lg transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2'
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className='animate-spin' />
                    Processing...
                  </>
                ) : (
                  'Book Now'
                )}
              </button>
            </div>

            <p className='text-gray-500 text-sm text-center mt-4'>
              By booking, you agree to our terms and conditions
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className='text-center text-gray-500 text-sm mt-8 pt-8 border-t border-slate-700'>
        <p>🎭 Theater Booking System v1.0 • Bookings sync with MongoDB</p>
        <p className='mt-1'>For assistance, contact: support@theater.com</p>
      </div>
    </div>
  );
};

export default TheaterTicketSystem;