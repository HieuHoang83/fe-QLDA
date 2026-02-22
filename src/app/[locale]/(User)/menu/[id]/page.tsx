function Item_food() {
  return (
    <div className="font-roboto ">
      <div className="container mx-auto px-28 py-12">
        <div className="mb-14">
          <h2 className="font-playfair text-3xl mb-6 justify-center flex">
            Giới thiệu
          </h2>
          <p className="text-gray-600 mb-4">
            Chúng tôi rất hân hạnh được giới thiệu đến quý khách menu pasta mới
            của chúng tôi. Với sự kết hợp tinh tế giữa nguyên liệu tươi ngon và
            công thức chế biến độc đáo, chúng tôi tự tin mang đến những món ăn
            pasta đậm đà hương vị, mang đến trải nghiệm ẩm thực đáng nhớ cho quý
            khách.
          </p>
        </div>

        <div className="mb-14">
          <h2 className="font-playfair text-3xl mb-6 justify-center flex">
            Các món pasta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-100 rounded-lg p-6 shadow-md">
              <h3 className="font-bold text-xl mb-3">Spaghetti Bolognese</h3>
              <p className="text-gray-600 mb-4">
                Món spaghetti với sốt thịt bò Ý truyền thống, phủ đều trên sợi
                mì dai dai.
              </p>
              <span className="font-medium text-gray-800">99.000 VNĐ</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-6 shadow-md">
              <h3 className="font-bold text-xl mb-3">Fettuccine Alfredo</h3>
              <p className="text-gray-600 mb-4">
                Mỳ fettuccine tươi, được tẩm sốt trắng bơ - phó mát béo ngậy.
              </p>
              <span className="font-medium text-gray-800">119.000 VNĐ</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-6 shadow-md">
              <h3 className="font-bold text-xl mb-3">Penne Arrabbiata</h3>
              <p className="text-gray-600 mb-4">
                Những ống mỳ penne với sốt cay, tỏi và ớt, mang đến hương vị đậm
                đà.
              </p>
              <span className="font-medium text-gray-800">109.000 VNĐ</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-6 shadow-md">
              <h3 className="font-bold text-xl mb-3">Linguine Alle Vongole</h3>
              <p className="text-gray-600 mb-4">
                Mỳ linguine xào với hải sản tươi ngon, tỏa hương biển xanh.
              </p>
              <span className="font-medium text-gray-800">139.000 VNĐ</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-6 shadow-md">
              <h3 className="font-bold text-xl mb-3">
                Ravioli Ricotta e Spinaci
              </h3>
              <p className="text-gray-600 mb-4">
                Món bánh đậu phô mai ricotta và rau bina, độc đáo và đầy dinh
                dưỡng.
              </p>
              <span className="font-medium text-gray-800">129.000 VNĐ</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className=" rounded-lg p-8 text-center">
            <h1 className="text-2xl text-gray-800 font-bold mb-4">
              Ưu đãi đặc biệt tại nhà hàng pasta của chúng tôi!
            </h1>
            <p className="text-gray-600 text-lg mb-6">
              Từ ngày 01/09/2023 đến hết ngày 30/11/2023, chúng tôi mang đến cho
              quý khách những ưu đãi hấp dẫn:
            </p>
            <div className="space-y-4 mb-6">
              <p className="text-gray-800">
                🍝{" "}
                <strong>Miễn phí kèm nước ngọt 330ml cho mỗi món pasta</strong>
              </p>
              <p className="text-gray-800">
                🍝{" "}
                <strong>
                  Áp dụng combo 2 món pasta + 2 nước ngọt 330ml với giá chỉ
                  299.000 VNĐ
                </strong>
              </p>
              <p className="text-gray-800">
                👤{" "}
                <strong>
                  Khách hàng thành viên nhận thêm 10% giảm giá trên tổng hóa đơn
                </strong>
              </p>
            </div>
            <a
              href="#"
              className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded"
            >
              Đặt bàn ngay
            </a>
          </div>
        </div>
      </div>

      <footer className="bg-gray-800 text-white py-4 text-center">
        <p>&copy; 2023 Pasta Delights. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Item_food;
