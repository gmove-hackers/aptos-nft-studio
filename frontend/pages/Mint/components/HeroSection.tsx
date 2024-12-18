import HeroImage from "@/assets/img/hero.webp";

interface HeroSectionProps {}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  return (
    <section>
      <div className="mx-auto xl:max-w-screen-xl xl:px-4 text-center">
        <img src={HeroImage} alt="" className="inline-block" />
      </div>
      <div className="mx-auto xl:max-w-screen-xl xl:px-4 xl:w-3/4 xl:min-w-[64rem] lg:max-w-5xl w-11/12 mt-8">
        <p className="bg-gray-700/25 rounded-lg px-6 py-4 leading-7">
          Move NFT Studio is a user-friendly platform that simplifies the creation and management of NFTs on the Aptos
          blockchain—no coding skills required. Our app empowers creators, collectors, and businesses by unlocking
          advanced NFT features, such as minting, combining, layering, composing, and more. Move NFT Studio is your
          gateway to the future of NFTs. Join us in democratizing cutting-edge NFT technology and unleashing infinite
          creativity in the Aptos ecosystem!
        </p>
      </div>
    </section>
  );
};
